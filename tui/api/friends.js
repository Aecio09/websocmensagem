import { api } from './client.js';

export async function listFriends(userId) {
  const res = await api.get(`/users/friends/${userId}`);
  return res.data;
}

export async function getPendingRequests(userId) {
  const res = await api.get(`/users/friends/pending/${userId}`);
  return res.data;
}

export async function getRelationshipStatus(userId, targetId) {
  const res = await api.get(`/users/friends/status/${userId}/${targetId}`);
  return res.data;
}

export async function sendFriendRequest(userId, friendId) {
  await api.post(`/users/friends/sendrequest/${userId}/${friendId}`);
}

export async function acceptFriendRequest(userId, friendId) {
  await api.post(`/users/friends/acceptrequest/${userId}/${friendId}`);
}

export async function rejectFriendRequest(userId, friendId) {
  await api.post(`/users/friends/rejectrequest/${userId}/${friendId}`);
}

export async function cancelFriendRequest(userId, friendId) {
  await api.post(`/users/friends/cancelrequest/${userId}/${friendId}`);
}
