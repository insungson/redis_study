import type { CreateUserAttrs } from '$services/types';
import { genId } from '$services/utils';
import { client } from '$services/redis/client';
import { usersKey, usernamesUniqueKey, usernamesKey } from '$services/keys';

export const getUserByUsername = async (username: string) => {
	// usernames 로 이뤄진 Sorted Set 을 사용하여
	// 로긴 시 username 을 사용하여 User ID 를 찾는 과정이다.
	const decimalId = await client.zScore(usernamesKey(), username);

	// ID 가 없다면.. 에러 발생
	if (!decimalId) {
		throw new Error('USer does not exist');
	}

	// id 를 받아서 hex 숫자로 변환 -> 16진수 string 으로 변환
	const id = decimalId.toString(16);
	// id로 유저의 Hash 정보를 가져온다!
	const user = await client.hGetAll(usersKey(id));

	// deserialize 로 hash 정보를 돌려준다!
	return deserialize(id, user);
};

export const getUserById = async (id: string) => {
	const user = await client.hGetAll(usersKey(id));

	return deserialize(id, user);
};

export const createUser = async (attrs: CreateUserAttrs) => {
	const id = genId(); // 13ksdkskf 이런식의 string이 생성된다

	// username 중복 체크 (Set 으로 만들어진 usernames 만듬)
	const exists = await client.sIsMember(usernamesUniqueKey(), attrs.username);
	if (exists) {
		throw new Error('Username is taken');
	}

	// 유저저장 Hash
	await serialize(usersKey(id), attrs);
	// 유저네임 따로 저장 Set
	await client.sAdd(usernamesUniqueKey(), attrs.username);
	// Sorted Set 으로 유저네임-유저ID 매칭 처리
	await client.zAdd(usernamesKey(), {
		value: attrs.username, // member 를 의미! (Sorted Set 에서)
		score: parseInt(id, 16) // 16진수 -> 숫자로 변경처리
	});

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
