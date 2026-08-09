
import { useQuery } from '@tanstack/react-query';
import { officeApi, ApiOfficeResponse, ApiWingResponse, ApiDecResponse } from '@/services/officeApi';

export const useOfficeHierarchy = () => {
  // Fetch offices
  const {
    data: officesResponse,
    isLoading: isLoadingOffices,
    error: officesError
  } = useQuery({
    queryKey: ['offices'],
    queryFn: async () => {
      
      const result = await officeApi.getOffices();
      
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch wings
  const {
    data: wingsResponse,
    isLoading: isLoadingWings,
    error: wingsError
  } = useQuery({
    queryKey: ['wings'],
    queryFn: async () => {
      
      const result = await officeApi.getWings();
      
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch DECs
  const {
    data: decsResponse,
    isLoading: isLoadingDecs,
    error: decsError
  } = useQuery({
    queryKey: ['decs'],
    queryFn: async () => {
      
      const result = await officeApi.getDecs();
      
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: 1000,
  });

  // Extract data from responses with proper null checks
  const offices: ApiOfficeResponse[] = officesResponse || [];
  const wings: ApiWingResponse[] = wingsResponse || [];
  const decs: ApiDecResponse[] = decsResponse || [];

  return {
    offices,
    wings,
    decs,
    isLoading: isLoadingOffices || isLoadingWings || isLoadingDecs,
    errors: {
      offices: officesError,
      wings: wingsError,
      decs: decsError
    }
  };
};
