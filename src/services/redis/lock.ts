import { client } from './client';
import { randomBytes } from 'crypto';

export const withLock = async (key: string, cb: (redisClient: Client, signal: any) => any) => {
	// Initialize a few variables to control retry behavior
	const retryDelayMs = 100;
	const timeoutMs = 2000;
	let retries = 20;

	// Generate a random value to store at the lock key
	const token = randomBytes(6).toString('hex');
	// Create the lock key
	const lockKey = `lock:${key}`;

	// Set up a while loop to implement the retry behavior
	while (retries >= 0) {
		retries--;
		// Try to do a SET NX operation
		const acquired = await client.set(lockKey, token, {
			NX: true,
			PX: timeoutMs, // 여기서 PX옵션으로 해당 시간 이후 해당 키를 unset처리를 해야한다.
		});

		if (!acquired) {
			// ELSE brief pause (retryDelayMs) and then retry
			await pause(retryDelayMs);
			continue; //다음 while loop 를 실행시키기 위한 continue 처리
		}

		// IF the set is successful, then run the callback
		// try 문에 해당 cb를 넣고 finally에서 해당 키에 대한 unlock 처리를 해준다
		try {
			const signal = { expired: false };
			setTimeout(() => {
				signal.expired = true;
			}, timeoutMs);

			const proxiedClient = buildClientProxy(timeoutMs);
			const result = await cb(proxiedClient, signal);
			return result;
		} finally {
			// 다른 프로세스의 키 값을 받기위한 lock 걸린 키에 대한 삭제 처리! 
			await client.unlock(lockKey, token);
		}
	}
};

type Client = typeof client;
const buildClientProxy = (timeoutMs: number) => {
	const startTime = Date.now();

	const handler = {
		get(target: Client, prop: keyof Client) {
			if (Date.now() >= startTime + timeoutMs) {
				throw new Error('Lock has expired.');
			}
			// 기존 proxy 객체 생성 시간 + 설정시간 이후 에러를 발생시킨다.
			const value = target[prop];
			return typeof value === 'function' ? value.bind(target) : value;
		}
	};
	// proxy 객체를 사용하여 기존 client 객체를 제정의 한다.
	return new Proxy(client, handler) as Client;
};

const pause = (duration: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, duration);
	});
};