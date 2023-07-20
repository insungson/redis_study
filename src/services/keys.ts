export const pageCacheKey = (id: string) => `pagecache#${id}`;
export const usersKey = (userId: string) => `users${userId}`;
export const sessionsKey = (sessionId: string) => `sessions#${sessionId}`;
export const itemsKey = (itemId: string) => `items#${itemId}`;
export const usernamesUniqueKey = () => 'usernames:unique'; // username 관리하는 set 키
export const userLikesKey = (userId: string) => `users:likes#${userId}`;
