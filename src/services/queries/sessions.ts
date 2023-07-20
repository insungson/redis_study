import type { Session } from '$services/types';
import { client } from '$services/redis/client';
import { sessionsKey } from '$services/keys';

export const getSession = async (id: string) => {
	const session = await client.hGetAll(sessionsKey(id));

	if (Object.keys(session).length === 0) {
		return null;
	}

	return deserialize(id, session);
};

export const saveSession = async (session: Session) => {
	return serialize(sessionsKey(session.id), session);
};

const deserialize = (id: string, session: { [key: string]: string }) => {
	return {
		id,
		userId: session.userId,
		username: session.username
	};
};

const serialize = (id: string, session: Session) => {
	const keys = Object.keys(session).filter((key) => key !== 'id');
	if (keys.length > 0) {
		let result = 0;
		keys.forEach(async (key, index) => {
			await client.hSet(id, { [key]: session[key] });
			result = index;
		});
		return result;
	}
};
