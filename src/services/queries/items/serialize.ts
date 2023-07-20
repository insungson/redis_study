import type { CreateItemAttrs } from '$services/types';

export const serialize = (attrs: CreateItemAttrs) => {
	return {
		...attrs,
		createdAt: attrs.createdAt.toMillis(), // .getTime() 이렇게 바꾸는게 나을것 같다..
		endingAt: attrs.endingAt.toMillis()
	};
};
