import { io } from 'socket.io-client';
import { ref } from 'vue';

// URL du serveur WebSocket (adaptable selon l'environnement Vite / production)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, '');

let socket = null;
export const isConnected = ref(false);

/**
 * Obtient ou initialise l'instance unique de connexion Socket.io
 */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true
    });

    socket.on('connect', () => {
      isConnected.value = true;
      console.log('⚡ [WebSocket] Connecté au serveur SaasResto (id:', socket.id, ')');
    });

    socket.on('disconnect', (reason) => {
      isConnected.value = false;
      console.warn('⚠️ [WebSocket] Déconnecté du serveur:', reason);
    });

    socket.on('connect_error', (error) => {
      isConnected.value = false;
      console.warn('⚠️ [WebSocket] Erreur de connexion:', error.message);
    });
  }
  return socket;
}

/**
 * Rejoint le salon d'une commande spécifique (pour l'écran de paiement/suivi client)
 */
export function joinOrderRoom(orderId) {
  if (!orderId) return;
  const s = getSocket();
  if (s.connected) {
    s.emit('join:order', orderId);
  } else {
    s.once('connect', () => {
      s.emit('join:order', orderId);
    });
  }
}

/**
 * Quitte le salon d'une commande
 */
export function leaveOrderRoom(orderId) {
  if (!orderId) return;
  const s = getSocket();
  if (s.connected) {
    s.emit('leave:order', orderId);
  }
}

/**
 * Rejoint le salon du personnel restaurant selon son rôle (caisse, cuisine, admin)
 */
export function joinStaffRoom(role) {
  if (!role) return;
  const s = getSocket();
  if (s.connected) {
    s.emit('join:staff', role);
  } else {
    s.once('connect', () => {
      s.emit('join:staff', role);
    });
  }
}

export default {
  getSocket,
  joinOrderRoom,
  leaveOrderRoom,
  joinStaffRoom,
  isConnected
};
