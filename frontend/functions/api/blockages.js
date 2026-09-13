let memoryBlockages = [
  {
    id: 1,
    type: "stairs",
    title: "Pedestrian Stairs (No Ramp)",
    description: "Stairs blocking accessible sidewalk",
    latitude: 15.4900,
    longitude: 73.8270,
    severity: "high",
    reported_at: "Active"
  },
  {
    id: 2,
    type: "broken_ramp",
    title: "Broken Concrete Lip",
    description: "5cm drop hazard on ramp edge",
    latitude: 15.4918,
    longitude: 73.8290,
    severity: "high",
    reported_at: "Active"
  }
];

export async function onRequestGet() {
  return new Response(JSON.stringify(memoryBlockages), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const newBlockage = {
      id: `cf-${Date.now()}`,
      ...body,
      reported_at: 'Just Now'
    };
    memoryBlockages.unshift(newBlockage);
    return new Response(JSON.stringify({ success: true, id: newBlockage.id, blockage: newBlockage }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept'
    }
  });
}
