const API_KEY = 'AIzaSyAszXC1be8aJ37eHuNcBm_-O1clWkPUwV4';
const BASE_URL = 'https://maps.googleapis.com/maps/api/place';

function getPhotoUrl(photoReference: string): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${API_KEY}`;
}

export const fetchNearbyVenues = async (lat: number, lng: number, radius: number): Promise<any[]> => {
  const types = "bar|night_club|disco";
  const googleUrl = `${BASE_URL}/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${types}&key=${API_KEY}`;
  const response = await fetch(googleUrl);
  const data = await response.json();
  return data.results || [];
}

async function fetchGooglePlaceDetails(placeId: string): Promise<any> {
  const detailsUrl = `${BASE_URL}/details/json?place_id=${placeId}&key=${API_KEY}`;
  const response = await fetch(detailsUrl);
  const data = await response.json();
  return data.result || {};
}

async function fetchFoursquareDetails(lat: number, lng: number, name: string): Promise<any> {
  const foursquareUrl = `https://api.foursquare.com/v2/venues/search?ll=${lat},${lng}&query=${encodeURIComponent(name)}&radius=3000&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&v=20250228`;
  const response = await fetch(foursquareUrl);
  const data = await response.json();
  return (data.response.venues && data.response.venues[0]) || {};
}

export const buildBarObject = async (venue: any, lat: number, lng: number): Promise<any> => {
  const googleDetails = await fetchGooglePlaceDetails(venue.place_id);
  const foursquareDetails = await fetchFoursquareDetails(lat, lng, venue.name);

  const dayAbbrevMap: Record<string, string> = {
    Monday: "Mon",
    Tuesday: "Tue",
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
    Saturday: "Sat",
    Sunday: "Sun"
  };

  const bar = {
    placeId: venue.place_id,
    name: venue.name || "",
    barType: googleDetails.types && googleDetails.types.includes("night_club") ? "Night Club" : "Bar",
    waitTime: googleDetails.waitTime || 0,
    crowdMeter: googleDetails.crowdMeter || "Medium",
    total_reviewer: googleDetails.user_ratings_total || 0,
    average_rating: googleDetails.rating || 0,
    cover: (googleDetails.photos && googleDetails.photos[0] && getPhotoUrl(googleDetails.photos[0].photo_reference)) || "",
    gallery: googleDetails.photos ? googleDetails.photos.map((photo: any) => getPhotoUrl(photo.photo_reference)) : [],
    about: {
      address: {
        placeName:
          googleDetails.formatted_address ||
          (foursquareDetails.location &&
          foursquareDetails.location.formattedAddress
            ? foursquareDetails.location.formattedAddress.join(", ")
            : "") ||
          "",
        latitude:
          googleDetails.geometry && googleDetails.geometry.location
            ? googleDetails.geometry.location.lat
            : (venue.geometry && venue.geometry.location ? venue.geometry.location.lat : 0),
        longitude:
          googleDetails.geometry && googleDetails.geometry.location
            ? googleDetails.geometry.location.lng
            : (venue.geometry && venue.geometry.location ? venue.geometry.location.lng : 0),
      },
      schedule: googleDetails.opening_hours
        ? googleDetails.opening_hours.weekday_text.map((text: string) => {
          const match = text.match(/^(\w+):\s*(.*)$/);
          if (match) {
            // Convert full weekday name to abbreviation
            const fullDay = match[1];
            const dayAbbrev = dayAbbrevMap[fullDay] || fullDay;
            return { day: dayAbbrev, time: match[2], status: "open" };
          }
          return { day: "", time: text, status: "open" };
        })
        : [],
      dressCode: googleDetails.dress_code ? googleDetails.dress_code.split(",") : [],
      music: googleDetails.music || [],
      snacks: [],
      drinks: [],
      website: googleDetails.website || ""
    }
  };

  if (foursquareDetails && foursquareDetails.location) {
    if (!bar.about.address.placeName && foursquareDetails.location.address) {
      bar.about.address.placeName = foursquareDetails.location.address;
    }
    if (foursquareDetails.categories && foursquareDetails.categories.length > 0) {
      bar.barType = foursquareDetails.categories[0].name || bar.barType;
    }
  }

  return bar;
}
