/**
 * AI Insights Service
 *
 * Provides AI-powered analysis and recommendations for rules.
 * Uses OpenAI API for advanced pattern detection and suggestions.
 */

import { logger } from '../utils/logger.js';
import { prisma } from '../db.js';
import * as cache from './cache.js';

// OpenAI client (lazy initialization)
let openaiClient: {
  chat: {
    completions: {
      create: (params: unknown) => Promise<{ choices: Array<{ message: { content: string } }> }>;
    };
  };
} | null = null;

/**
 * Initialize OpenAI client
 */
async function getOpenAIClient() {
  if (openaiClient) return openaiClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn('OpenAI API key not configured');
    return null;
  }

  try {
    const { OpenAI } = await import('openai');
    openaiClient = new OpenAI({ apiKey });
    return openaiClient;
  } catch (error) {
    logger.error({ error }, 'Failed to initialize OpenAI client');
    return null;
  }
}

/**
 * Analysis types
 */
export interface PatternAnalysis {
  patterns: Array<{
    type: string;
    description: string;
    frequency: number;
    severity: 'high' | 'medium' | 'low';
    affectedRules: string[];
    suggestedFix: string;
  }>;
  overallScore: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface RuleRecommendation {
  ruleId: string;
  name: string;
  reason: string;
  confidence: number;
  category: string;
  source: 'marketplace' | 'ai-generated' | 'similar-team';
}

export interface ViolationInsight {
  summary: string;
  rootCause: string;
  suggestedActions: string[];
  relatedRules: string[];
  learningResources: string[];
}

/**
 * Analyze violation patterns for a team
 */
export async function analyzePatterns(teamId: string): Promise<PatternAnalysis> {
  const cacheKey = `ai:patterns:${teamId}`;
  const cached = await cache.get<PatternAnalysis>(cacheKey);
  if (cached) return cached;

  // Fetch recent violations
  const violations = await prisma.violation.findMany({
    where: {
      teamId,
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      },
    },
    include: {
      rule: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 1000,
  });

  // Group violations by rule
  const ruleViolations = new Map<string, number>();
  for (const v of violations) {
    const count = ruleViolations.get(v.ruleId) || 0;
    ruleViolations.set(v.ruleId, count + 1);
  }

  // Identify patterns using basic heuristics
  const patterns: PatternAnalysis['patterns'] = [];

  // Pattern: Frequent violations
  const frequentViolations = Array.from(ruleViolations.entries())
    .filter(([_, count]) => count > 10)
    .sort((a, b) => b[1] - a[1]);

  for (const [ruleId, count] of frequentViolations.slice(0, 5)) {
    const rule = violations.find((v) => v.ruleId === ruleId)?.rule;
    if (rule) {
      patterns.push({
        type: 'frequent_violation',
        description: `"${rule.name}" is frequently violated`,
        frequency: count,
        severity: count > 50 ? 'high' : count > 20 ? 'medium' : 'low',
        affectedRules: [ruleId],
        suggestedFix: `Consider reviewing the rule clarity or providing more examples`,
      });
    }
  }

  // Calculate overall score (0-100)
  const totalViolations = violations.length;
  const overallScore = Math.max(0, 100 - totalViolations * 0.1);

  // Determine trend (compare with previous period)
  const previousPeriodViolations = await prisma.violation.count({
    where: {
      teamId,
      createdAt: {
        gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
  });

  let trend: PatternAnalysis['trend'] = 'stable';
  if (totalViolations < previousPeriodViolations * 0.9) {
    trend = 'improving';
  } else if (totalViolations > previousPeriodViolations * 1.1) {
    trend = 'declining';
  }

  const result: PatternAnalysis = {
    patterns,
    overallScore: Math.round(overallScore),
    trend,
  };

  await cache.set(cacheKey, result, 3600); // Cache for 1 hour
  return result;
}

/**
 * Get AI-powered rule recommendations
 */
export async function getRecommendations(
  teamId: string,
  limit: number = 5
): Promise<RuleRecommendation[]> {
  const cacheKey = `ai:recommendations:${teamId}`;
  const cached = await cache.get<RuleRecommendation[]>(cacheKey);
  if (cached) return cached;

  // Get team's existing rules
  const existingRules = await prisma.rule.findMany({
    where: { teamId },
    select: { ruleId: true, category: true, tags: true },
  });

  const existingCategories = new Set(existingRules.map((r) => r.category));
  const existingTags = new Set(existingRules.flatMap((r) => r.tags));

  // Get popular marketplace rules in similar categories
  const marketplaceRules = await prisma.marketplaceRule.findMany({
    where: {
      category: { in: Array.from(existingCategories) },
      NOT: {
        ruleId: { in: existingRules.map((r) => r.ruleId) },
      },
    },
    orderBy: {
      downloads: 'desc',
    },
    take: limit * 2,
  });

  const recommendations: RuleRecommendation[] = marketplaceRules
    .slice(0, limit)
    .map((rule) => {
      // Calculate confidence based on tag overlap and popularity
      const ruleTags = new Set(rule.tags);
      const tagOverlap = Array.from(ruleTags).filter((t) =>
        existingTags.has(t)
      ).length;
      const confidence = Math.min(
        1,
        0.5 + tagOverlap * 0.1 + (rule.downloads / 10000) * 0.2
      );

      return {
        ruleId: rule.ruleId,
        name: rule.name,
        reason: `Popular in ${rule.category} with ${rule.downloads} downloads`,
        confidence,
        category: rule.category,
        source: 'marketplace' as const,
      };
    })
    .sort((a, b) => b.confidence - a.confidence);

  await cache.set(cacheKey, recommendations, 3600);
  return recommendations;
}

/**
 * Get AI-powered violation insight
 */
export async function getViolationInsight(
  violationId: string
): Promise<ViolationInsight | null> {
  const client = await getOpenAIClient();

  const violation = await prisma.violation.findUnique({
    where: { id: violationId },
    include: {
      rule: true,
    },
  });

  if (!violation) return null;

  // Try AI-powered analysis if available
  if (client) {
    try {
      const prompt = `Analyze this coding rule violation and provide insights:

Rule: ${violation.rule.name}
Description: ${violation.rule.description}
Code snippet: ${violation.codeSnippet || 'Not provided'}

Provide:
1. A brief summary of why this is a violation
2. The root cause
3. 3 suggested actions to fix it
4. Related coding concepts to learn

Format as JSON with keys: summary, rootCause, suggestedActions (array), learningResources (array)`;

      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          ...parsed,
          relatedRules: [violation.rule.ruleId],
        };
      }
    } catch (error) {
      logger.error({ error }, 'AI insight generation failed');
    }
  }

  // Fallback to basic insight
  return {
    summary: `Violation of "${violation.rule.name}"`,
    rootCause: violation.rule.description || 'Rule violation detected',
    suggestedActions: [
      'Review the rule documentation',
      'Check code examples for correct patterns',
      'Consider adding a comment if this is an intentional exception',
    ],
    relatedRules: [violation.rule.ruleId],
    learningResources: [],
  };
}

/**
 * Generate AI-powered rule improvement suggestions
 */
export async function getRuleImprovements(
  ruleId: string
): Promise<Array<{ suggestion: string; priority: 'high' | 'medium' | 'low' }>> {
  const client = await getOpenAIClient();

  const rule = await prisma.rule.findUnique({
    where: { id: ruleId },
  });

  if (!rule) return [];

  // Get violation count for this rule
  const violationCount = await prisma.violation.count({
    where: { ruleId },
  });

  const suggestions: Array<{
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }> = [];

  // High violation count suggests unclear rule
  if (violationCount > 50) {
    suggestions.push({
      suggestion: 'This rule has many violations. Consider adding more examples or clarifying the description.',
      priority: 'high',
    });
  }

  // Check for missing examples
  const examples = rule.examples as { good?: string[]; bad?: string[] } | null;
  if (!examples?.good?.length) {
    suggestions.push({
      suggestion: 'Add positive examples to show correct patterns',
      priority: 'medium',
    });
  }
  if (!examples?.bad?.length) {
    suggestions.push({
      suggestion: 'Add negative examples to show what to avoid',
      priority: 'medium',
    });
  }

  // Check for missing tags
  if (!rule.tags || rule.tags.length < 2) {
    suggestions.push({
      suggestion: 'Add more tags to improve discoverability',
      priority: 'low',
    });
  }

  // Try AI-powered suggestions if available
  if (client && suggestions.length < 3) {
    try {
      const prompt = `Review this coding rule and suggest 2 improvements:

Name: ${rule.name}
Description: ${rule.description}
Category: ${rule.category}

Provide 2 specific, actionable suggestions to make this rule more effective.
Format as JSON array with objects containing "suggestion" (string) and "priority" ("high", "medium", or "low")`;

      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const aiSuggestions = JSON.parse(content);
        suggestions.push(...aiSuggestions.slice(0, 2));
      }
    } catch (error) {
      logger.error({ error }, 'AI rule improvement generation failed');
    }
  }

  return suggestions;
}

/**
 * Generate team compliance summary using AI
 */
export async function getComplianceSummary(teamId: string): Promise<string> {
  const client = await getOpenAIClient();

  // Get team stats
  const [rules, violations, proposals] = await Promise.all([
    prisma.rule.count({ where: { teamId, enabled: true } }),
    prisma.violation.count({
      where: {
        teamId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.proposal.count({
      where: {
        teamId,
        status: 'PENDING',
      },
    }),
  ]);

  const basicSummary = `Your team has ${rules} active rules with ${violations} violations in the past week and ${proposals} pending proposals.`;

  if (!client) return basicSummary;

  try {
    const prompt = `Generate a brief, encouraging compliance summary for a development team:

- Active rules: ${rules}
- Violations this week: ${violations}
- Pending proposals: ${proposals}

Keep it under 100 words and include one actionable suggestion.`;

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 150,
    });

    return response.choices[0]?.message?.content || basicSummary;
  } catch (error) {
    logger.error({ error }, 'AI summary generation failed');
    return basicSummary;
  }
}
