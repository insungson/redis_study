import { createClient, defineScript } from 'redis';
import { itemsKey, itemsByViewsKey, itemsViewsKey } from '$services/keys';

const client = createClient({
   socket: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT)
   },
   password: process.env.REDIS_PW,
   scripts: {
      unlock: defineScript({
			NUMBER_OF_KEYS: 1,
			transformArguments(key: string, token: string) {
				return [key, token];
			},
			transformReply(reply: any) {
				return reply;
			},
			SCRIPT: `
				if redis.call('GET', KEYS[1]) == ARGV[1] then
					return redis.call('DEL', KEYS[1])
				end
			`
		}),
      addOneAndStore: defineScript({ //redis client 에 addOneAndStore 메서드를 정의한다.
         NUMBER_OF_KEYS: 1,   // LUA script 에 들어갈 key 의 갯수를 정해준다!!
         SCRIPT: `
            return redis.call('SET', KEYS[1], 1 + tonumber(ARGV[1]))
         `,
         transformArguments(key: string, value: number) { // transformArguments 는 EVALSHA로 넣어주는 역할을 한다.
            return [key, value.toString()]; 
            // ['books:count', '5']
            // EVALSHA <ID> 1 'books:count' '5'  // 여기선 이렇게 넣어준다. 
         },
         transformReply(reply: any) { // transformReply 는 redis 에서 가져온 데이터를 여기서 리턴해주는 것이다.
            return reply; // 여기선 그냥 리턴을 해준다.
         }
      }),

      // LUA Script 를 짜는데 필요한 프로세스

      // // 1)) redis에 사용할 keys, arguments 들을 정한다.
      // 필요한 keys 들!! 
      // 1) itemsViewsKey
      // 2)   itemsKey -> items#sdjhasjkf // 이런 키가 사용됨
      // 3) itemsByViewsKey
      // EVALSHA ID 3

      // 필요한 Arguments 들!!
      // 1) itemId
      // 2) userId

      // // 2)) keys, arguments 들은 script 의 최상단에 정의해 주자!!
      // 그래야 코드이해가 쉽다.

      // // 3)) 로직을 짜자!!

      // // 4)) 필요하다면 리턴해줄 deserialize 처리도 해준다!!

      incrementView: defineScript({
         NUMBER_OF_KEYS: 3, //여기선 3개의 키가 사용된다.
         // 보통 스크립트의 첫 부분에 keys, arguments 변수들을 정의하고 script 를 짜는게 코드이해에 좋다!!
         // if then end 조건문을 사용하여 inserted 가 되었을때만 count 값을 추가해준다!!
         SCRIPT: `
            local itemsViewsKey = KEYS[1]
            local itemsKey = KEYS[2]
            local itemsByViewsKey = KEYS[3]
            local itemId = ARGV[1]
            local userId = ARGV[2]

            local inserted = redis.call('PFADD', itemsViewsKey, userId)

            if inserted == 1 then
               redis.call('HINCRBY', itemsKey, 'views', 1)
               redis.call('ZINCRBY', itemsByViewsKey, 1, itemId)
            end
         `,
         // EVALSHA 를 위한 처리를 해준다!! ARGV 에 해당 하는것만 적어준다!!! (ARGV 는 argument 이므로 이렇게 처리한다!!)
         transformArguments(itemId: string, userId: string) { 
            return [itemsViewsKey(itemId), itemsKey(itemId), itemsByViewsKey(), itemId, userId];
            // EVALSHA ID 3 items:views$asdf items#asdf items:views asdf 1234
            // LUA script 를 위의 EVALSHA 로 처리한것이다.
         },
         transformReply() {} //여기선 따로 리턴해주는것이 없으므로 이렇게 처리한다.
      })
   }
});

client.on('error', (err) => console.error(err));
client.connect();

export { client };