import { env } from '@/env';
import axios from 'axios';
import logger from '@/app/configs/logger.configs';

type TGeoResponse = { countryCode: string; countryName: string };

export const getCountryFromGps = async (
  lat: number,
  lng: number
): Promise<TGeoResponse> => {
  const provider = env.GEO_PROVIDER || 'nominatim';

  try {
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
      // Use a descriptive User-Agent per Nominatim usage policy and include a contact email
      const userAgent = env.GEO_USER_AGENT || 'event-management-worker/1.0';
      const contactEmail = env.SMTP_USER || '';
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}${
        contactEmail ? `&email=${encodeURIComponent(contactEmail)}` : ''
      }`;

      const { data } = await axios.get(url, {
        headers: { 'User-Agent': userAgent, Referer: 'http://localhost' },
      });

      return {
        countryCode: data.address?.country_code?.toUpperCase() || 'UNKNOWN',
        countryName: data.address?.country || 'Unknown',
      };
    }
  } catch (error: any) {
    // Log more details to help debugging 403 errors
    const status = error?.response?.status;
    const respData = error?.response?.data;
    logger?.error?.(
      `Geocoder error (provider=${provider}) status=${status} body=${JSON.stringify(
        respData
      )}`
    );
    // If nominatim failed (e.g., 403) and we have a Google Maps API key, try Google as a fallback
    if (provider !== 'google' && env.GOOGLE_MAPS_API_KEY) {
      try {
        logger?.info?.('Falling back to Google Maps geocoding');
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
      } catch (googleError: any) {
        logger?.error?.(
          `Google geocoder fallback failed: ${googleError?.response?.status} ${JSON.stringify(
            googleError?.response?.data
          )}`
        );
      }
    }

    throw error;
  }
};
