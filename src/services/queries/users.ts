import type { CreateUserAttrs } from '$services/types';
import { genId } from '$services/utils';
import { client } from '$services/redis/client';
import { usersKey, usernamesUniqueKey } from '$services/keys';

export const getUserByUsername = async (username: string) => {};

export const getUserById = async (id: string) => {
	const user = await client.hGetAll(usersKey(id));

	return deserialize(id, user);
};

export const createUser = async (attrs: CreateUserAttrs) => {
	const id = genId();

	// username 중복 체크
	const exists = await client.sIsMember(usernamesUniqueKey(), attrs.username);
	if (exists) {
		throw new Error('Username is taken');
	}

	// 유저저장 Hash
	await serialize(usersKey(id), attrs);
	// 유저네임 따로 저장 Set
	await client.sAdd(usernamesUniqueKey(), attrs.username);

	return id;
};

const serialize = (id: string, user: CreateUserAttrs) => {
	const keys = Object.keys(user);
	if (keys.length > 0) {
		keys.forEach(async (key) => {
			await client.hSet(id, { [`${key}`]: user[key] });
		});
	}
};

const deserialize = (id: string, user: { [key: string]: string }) => {
	return {
		id,
		username: user.username,
		password: user.password
	};
};
