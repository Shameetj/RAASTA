export async function onRequestGet() {
  const locations = [
    { id: 1, name: "Vasco da Gama Railway Station", latitude: 15.3990, longitude: 73.8115 },
    { id: 2, name: "Gomes Road Market", latitude: 15.4020, longitude: 73.8150 },
    { id: 3, name: "Baina Beach Promenade", latitude: 15.3850, longitude: 73.8100 },
    { id: 4, name: "Central Metro Station", latitude: 15.4910, longitude: 73.8260 }
  ];
  return new Response(JSON.stringify(locations), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept'
    }
  });
}
