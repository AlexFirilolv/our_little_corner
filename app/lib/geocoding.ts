/**
 * Google Maps Geocoding API utility
 *
 * Converts GPS coordinates to human-readable place names.
 * Free tier: $200/month credit = ~40,000 requests/month
 */

interface GeocodeResult {
  formattedAddress: string;
  placeName?: string;        // Specific place/business name if available
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  shortName: string;         // Concise name for display (e.g., "Mandoria, Łódź")
}

interface GoogleGeocodeResponse {
  results: Array<{
    formatted_address: string;
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    types: string[];
  }>;
  status: string;
  error_message?: string;
}

/**
 * Reverse geocode coordinates to a human-readable location
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodeResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn('GOOGLE_MAPS_API_KEY not configured, skipping reverse geocoding');
    return null;
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${latitude},${longitude}`);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('result_type', 'point_of_interest|establishment|neighborhood|locality|sublocality');
    url.searchParams.set('language', 'en');

    const response = await fetch(url.toString());
    const data: GoogleGeocodeResponse = await response.json();

    if (data.status !== 'OK') {
      // Try again without result_type filter for more results
      url.searchParams.delete('result_type');
      const fallbackResponse = await fetch(url.toString());
      const fallbackData: GoogleGeocodeResponse = await fallbackResponse.json();

      if (fallbackData.status !== 'OK') {
        console.error('Geocoding failed:', fallbackData.status, fallbackData.error_message);
        return null;
      }

      return parseGeocodeResponse(fallbackData);
    }

    return parseGeocodeResponse(data);
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Parse Google's geocode response into a clean result
 */
function parseGeocodeResponse(data: GoogleGeocodeResponse): GeocodeResult {
  const result = data.results[0];

  // Extract address components
  const components: Record<string, string> = {};
  for (const component of result.address_components) {
    for (const type of component.types) {
      components[type] = component.long_name;
    }
  }

  // Try to find a point of interest or establishment name
  let placeName: string | undefined;
  for (const res of data.results) {
    if (res.types.includes('point_of_interest') ||
        res.types.includes('establishment') ||
        res.types.includes('tourist_attraction')) {
      // The first component is usually the place name
      const firstComponent = res.address_components[0];
      if (firstComponent && !firstComponent.types.includes('street_number')) {
        placeName = firstComponent.long_name;
        break;
      }
    }
  }

  // Build a concise short name for display
  let shortName: string;

  if (placeName) {
    // If we have a place name, use it with city
    const city = components['locality'] || components['sublocality'] || components['administrative_area_level_2'];
    shortName = city ? `${placeName}, ${city}` : placeName;
  } else {
    // Otherwise, use neighborhood/city/country format
    const parts: string[] = [];

    if (components['neighborhood']) {
      parts.push(components['neighborhood']);
    } else if (components['sublocality']) {
      parts.push(components['sublocality']);
    }

    if (components['locality']) {
      parts.push(components['locality']);
    } else if (components['administrative_area_level_2']) {
      parts.push(components['administrative_area_level_2']);
    }

    // Add country for international context if not too long
    if (parts.length < 2 && components['country']) {
      parts.push(components['country']);
    }

    shortName = parts.length > 0 ? parts.join(', ') : result.formatted_address;
  }

  return {
    formattedAddress: result.formatted_address,
    placeName,
    neighborhood: components['neighborhood'] || components['sublocality'],
    city: components['locality'] || components['administrative_area_level_2'],
    state: components['administrative_area_level_1'],
    country: components['country'],
    shortName,
  };
}

/**
 * Format coordinates nicely as a fallback when geocoding fails
 */
export function formatCoordinates(latitude: number, longitude: number): string {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(latitude).toFixed(2)}°${latDir}, ${Math.abs(longitude).toFixed(2)}°${lonDir}`;
}
