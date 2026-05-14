import { env } from '@/env';
import axios from 'axios';

type TGeoResponse = { countryCode: string; countryName: string };

export const getCountryFromGps = async (
  lat: number,
  lng: number
): Promise<TGeoResponse> => {
  const provider = env.GEO_PROVIDER || 'nominatim';

  if (provider === 'google') {
    // Google Maps Implementation
    const { data } = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${env.GOOGLE_MAPS_API_KEY}`
    );

    const countryComponent = data.results[0]?.address_components.find(
      (c: any) => c.types.includes('country')
    );

    return {
      countryCode: countryComponent?.short_name || 'UNKNOWN',
      countryName: countryComponent?.long_name || 'Unknown',
    };
  } else {
    // Nominatim Implementation (Development)
    const { data } = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { 'User-Agent': 'YourAppName/1.0' } }
    );

    return {
      countryCode: data.address?.country_code?.toUpperCase() || 'UNKNOWN',
      countryName: data.address?.country || 'Unknown',
    };
  }
};
