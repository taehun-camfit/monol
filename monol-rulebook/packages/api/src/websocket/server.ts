/**
 * WebSocket Server
 *
 * Provides real-time communication for:
 * - Live notifications
 * - Proposal discussions
 * - Team presence
 * - Collaborative editing
 */

import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger.js';
import jwt from 'jsonwebtoken';

// ============================================================================
// Types
// ============================================================================

interface Client {
  id: string;
  userId: string;
  teamIds: string[];
  socket: WebSocket;
  lastPing: number;
}

interface WSMessage {
  type: string;
  payload: unknown;
}

interface AuthenticatedMessage extends WSMessage {
  type: 'auth';
  payload: {
    token: string;
  };
}

interface SubscribeMessage extends WSMessage {
  type: 'subscribe';
  payload: {
    channels: string[];
  };
}

interface UnsubscribeMessage extends WSMessage {
  type: 'unsubscribe';
  payload: {
    channels: string[];
  };
}

// ============================================================================
// WebSocket Server Class
// ============================================================================

export class RulebookWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // channel -> clientIds
  private pingInterval: NodeJS.Timer | null = null;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      perMessageDeflate: true,
    });

    this.setupEventHandlers();
    this.startPingInterval();

    logger.info('WebSocket server initialized');
  }

  private setupEventHandlers(): void {
    this.wss.on('connection', (socket, req) => {
      const clientId = this.generateClientId();
      logger.info({ clientId }, 'New WebSocket connection');

      // Create temporary client (not yet authenticated)
      const client: Client = {
        id: clientId,
        userId: '',
        teamIds: [],
        socket,
        lastPing: Date.now(),
      };

      // Set up message handler
      socket.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as WSMessage;
          this.handleMessage(client, message);
        } catch (error) {
          logger.error({ error }, 'Failed to parse WebSocket message');
          this.sendError(socket, 'Invalid message format');
        }
      });

      // Set up close handler
      socket.on('close', () => {
        this.handleDisconnect(client);
      });

      // Set up error handler
      socket.on('error', (error) => {
        logger.error({ error, clientId }, 'WebSocket error');
      });

      // Send welcome message
      this.send(socket, {
        type: 'welcome',
        payload: { clientId },
      });
    });
  }

  private handleMessage(client: Client, message: WSMessage): void {
    switch (message.type) {
      case 'auth':
        this.handleAuth(client, message as AuthenticatedMessage);
        break;
      case 'subscribe':
        this.handleSubscribe(client, message as SubscribeMessage);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(client, message as UnsubscribeMessage);
        break;
      case 'ping':
        client.lastPing = Date.now();
        this.send(client.socket, { type: 'pong', payload: {} });
        break;
      case 'presence':
        this.handlePresence(client, message);
        break;
      default:
        logger.warn({ type: message.type }, 'Unknown message type');
    }
  }

  private handleAuth(client: Client, message: AuthenticatedMessage): void {
    const { token } = message.payload;

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'secret'
      ) as { userId: string; teamIds: string[] };

      client.userId = decoded.userId;
      client.teamIds = decoded.teamIds || [];

      // Store authenticated client
      this.clients.set(client.id, client);

      // Auto-subscribe to user and team channels
      const channels = [
        `user:${client.userId}`,
        ...client.teamIds.map((id) => `team:${id}`),
      ];

      channels.forEach((channel) => {
        this.subscribeToChannel(client.id, channel);
      });

      this.send(client.socket, {
        type: 'auth_success',
        payload: { userId: client.userId, channels },
      });

      logger.info({ userId: client.userId }, 'Client authenticated');
    } catch (error) {
      this.sendError(client.socket, 'Authentication failed');
      client.socket.close();
    }
  }

  private handleSubscribe(client: Client, message: SubscribeMessage): void {
    if (!client.userId) {
      this.sendError(client.socket, 'Not authenticated');
      return;
    }

    const { channels } = message.payload;
    const subscribedChannels: string[] = [];

    channels.forEach((channel) => {
      // Validate channel access
      if (this.canAccessChannel(client, channel)) {
        this.subscribeToChannel(client.id, channel);
        subscribedChannels.push(channel);
      }
    });

    this.send(client.socket, {
      type: 'subscribed',
      payload: { channels: subscribedChannels },
    });
  }

  private handleUnsubscribe(client: Client, message: UnsubscribeMessage): void {
    const { channels } = message.payload;

    channels.forEach((channel) => {
      this.unsubscribeFromChannel(client.id, channel);
    });

    this.send(client.socket, {
      type: 'unsubscribed',
      payload: { channels },
    });
  }

  private handlePresence(client: Client, message: WSMessage): void {
    if (!client.userId) return;

    // Broadcast presence to team channels
    client.teamIds.forEach((teamId) => {
      this.broadcast(`team:${teamId}`, {
        type: 'presence_update',
        payload: {
          userId: client.userId,
          status: (message.payload as { status: string }).status || 'online',
          timestamp: Date.now(),
        },
      }, client.id);
    });
  }

  private handleDisconnect(client: Client): void {
    // Remove from all subscriptions
    this.subscriptions.forEach((clientIds, channel) => {
      clientIds.delete(client.id);
    });

    // Remove from clients
    this.clients.delete(client.id);

    // Broadcast offline status
    if (client.userId) {
      client.teamIds.forEach((teamId) => {
        this.broadcast(`team:${teamId}`, {
          type: 'presence_update',
          payload: {
            userId: client.userId,
            status: 'offline',
            timestamp: Date.now(),
          },
        });
      });
    }

    logger.info({ clientId: client.id }, 'Client disconnected');
  }

  private subscribeToChannel(clientId: string, channel: string): void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(clientId);
  }

  private unsubscribeFromChannel(clientId: string, channel: string): void {
    this.subscriptions.get(channel)?.delete(clientId);
  }

  private canAccessChannel(client: Client, channel: string): boolean {
    // User can access their own channel
    if (channel === `user:${client.userId}`) return true;

    // User can access their team channels
    if (channel.startsWith('team:')) {
      const teamId = channel.replace('team:', '');
      return client.teamIds.includes(teamId);
    }

    // Public channels (e.g., marketplace)
    if (channel.startsWith('public:')) return true;

    return false;
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60 seconds

      this.clients.forEach((client, clientId) => {
        if (now - client.lastPing > timeout) {
          logger.info({ clientId }, 'Client timed out');
          client.socket.terminate();
          this.handleDisconnect(client);
        }
      });
    }, 30000);
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Broadcast message to all subscribers of a channel
   */
  broadcast(channel: string, message: WSMessage, excludeClientId?: string): void {
    const clientIds = this.subscriptions.get(channel);
    if (!clientIds) return;

    clientIds.forEach((clientId) => {
      if (excludeClientId && clientId === excludeClientId) return;

      const client = this.clients.get(clientId);
      if (client && client.socket.readyState === WebSocket.OPEN) {
        this.send(client.socket, message);
      }
    });
  }

  /**
   * Send message to a specific user
   */
  sendToUser(userId: string, message: WSMessage): void {
    this.broadcast(`user:${userId}`, message);
  }

  /**
   * Send message to all members of a team
   */
  sendToTeam(teamId: string, message: WSMessage): void {
    this.broadcast(`team:${teamId}`, message);
  }

  /**
   * Get online users for a team
   */
  getOnlineUsers(teamId: string): string[] {
    const channel = `team:${teamId}`;
    const clientIds = this.subscriptions.get(channel) || new Set();

    const userIds = new Set<string>();
    clientIds.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client?.userId) {
        userIds.add(client.userId);
      }
    });

    return Array.from(userIds);
  }

  /**
   * Close server
   */
  close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.wss.close();
    logger.info('WebSocket server closed');
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private send(socket: WebSocket, message: WSMessage): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  private sendError(socket: WebSocket, error: string): void {
    this.send(socket, { type: 'error', payload: { message: error } });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

// ============================================================================
// Event Types for Type Safety
// ============================================================================

export const WSEventTypes = {
  // Notifications
  NOTIFICATION: 'notification',
  NOTIFICATION_READ: 'notification_read',

  // Proposals
  PROPOSAL_CREATED: 'proposal_created',
  PROPOSAL_UPDATED: 'proposal_updated',
  PROPOSAL_REVIEWED: 'proposal_reviewed',
  PROPOSAL_MERGED: 'proposal_merged',

  // Comments
  COMMENT_CREATED: 'comment_created',
  COMMENT_UPDATED: 'comment_updated',
  COMMENT_DELETED: 'comment_deleted',

  // Rules
  RULE_CREATED: 'rule_created',
  RULE_UPDATED: 'rule_updated',
  RULE_DELETED: 'rule_deleted',

  // Team
  MEMBER_JOINED: 'member_joined',
  MEMBER_LEFT: 'member_left',
  MEMBER_ROLE_CHANGED: 'member_role_changed',

  // Presence
  PRESENCE_UPDATE: 'presence_update',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
} as const;

export type WSEventType = (typeof WSEventTypes)[keyof typeof WSEventTypes];
