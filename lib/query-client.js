import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			staleTime: 60000,
			gcTime: 300000,
			retry: 2,
			retryDelay: 500,
		},
	},
});