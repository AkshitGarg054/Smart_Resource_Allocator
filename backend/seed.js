/**
 * seed.js — SRA Quick-Start Seeder
 *
 * Inserts 12 volunteers, 12 incidents, and 12 field reports with pre-built
 * data (no AI pipeline required). Coordinates are spread across Jaipur so
 * they look natural on the Leaflet map.
 *
 * Usage:
 *   node seed.js
 *
 * Wipes all existing Volunteers, Incidents, and Reports before inserting.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Volunteer = require('./src/models/Volunteer');
const Incident  = require('./src/models/Incident');
const Report    = require('./src/models/Report');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Add ±metersMax of random jitter to a coordinate pair. */
function jitter({ lat, lng }, metersMax = 150) {
  const deg = 1 / 111_320;
  const d   = () => (Math.random() - 0.5) * 2 * metersMax * deg;
  return { lat: lat + d(), lng: lng + d() };
}

/** Return a Date that is `minutesAgo` minutes before now. */
function minsAgo(n) {
  return new Date(Date.now() - n * 60_000);
}

// ── Jaipur landmarks (real coords) ───────────────────────────────────────────

const L = {
  hawaMahal:    { lat: 26.9239, lng: 75.8267 },
  cityPalace:   { lat: 26.9258, lng: 75.8237 },
  jawaharCircle:{ lat: 26.8515, lng: 75.8064 },
  mansarovar:   { lat: 26.8686, lng: 75.7597 },
  malviyaNagar: { lat: 26.8530, lng: 75.8133 },
  vaishaliNagar:{ lat: 26.9123, lng: 75.7415 },
  tonkRoad:     { lat: 26.8738, lng: 75.7910 },
  cHandPole:    { lat: 26.9197, lng: 75.8146 },
  rajapark:     { lat: 26.9050, lng: 75.8120 },
  sikarRoad:    { lat: 26.9450, lng: 75.7620 },
  baniPark:     { lat: 26.9310, lng: 75.7890 },
  sodala:       { lat: 26.9220, lng: 75.7710 },
};

// ── GeoJSON helper (Volunteer & Incident use [lng, lat] GeoJSON Points) ──────

function geoPoint({ lat, lng }) {
  return { type: 'Point', coordinates: [lng, lat] };
}

// ════════════════════════════════════════════════════════════════════════════
// 1. VOLUNTEERS — 12 across Jaipur
// ════════════════════════════════════════════════════════════════════════════

function buildVolunteers() {
  const defs = [
    { name: 'Aarav Sharma',    skills: ['Health', 'First Aid', 'Medical'],       status: 'available', loc: L.hawaMahal,     hours: 12, trust: 0.91 },
    { name: 'Priya Gupta',     skills: ['Food', 'Logistics', 'Distribution'],    status: 'available', loc: L.cityPalace,    hours: 8,  trust: 0.85 },
    { name: 'Vikram Singh',    skills: ['Safety', 'Security', 'First Aid'],      status: 'assigned',  loc: L.jawaharCircle, hours: 22, trust: 0.78 },
    { name: 'Neha Rathore',    skills: ['Medical', 'Counseling', 'Education'],   status: 'available', loc: L.mansarovar,   hours: 5,  trust: 0.93 },
    { name: 'Arjun Meena',     skills: ['Infrastructure', 'Construction'],       status: 'assigned',  loc: L.malviyaNagar, hours: 30, trust: 0.70 },
    { name: 'Kavita Joshi',    skills: ['Shelter', 'Logistics'],                 status: 'available', loc: L.vaishaliNagar,hours: 3,  trust: 0.88 },
    { name: 'Rohan Yadav',     skills: ['Water', 'Sanitation'],                  status: 'resting',   loc: L.tonkRoad,     hours: 38, trust: 0.65 },
    { name: 'Sunita Verma',    skills: ['Health', 'Medical', 'First Aid'],       status: 'available', loc: L.cHandPole,    hours: 15, trust: 0.80 },
    { name: 'Deepak Kumawat',  skills: ['Food', 'Distribution'],                 status: 'available', loc: L.rajapark,     hours: 6,  trust: 0.76 },
    { name: 'Anjali Patel',    skills: ['Education', 'Counseling', 'Teaching'],  status: 'assigned',  loc: L.sikarRoad,    hours: 18, trust: 0.82 },
    { name: 'Ravi Choudhary',  skills: ['Safety', 'Security'],                   status: 'available', loc: L.baniPark,     hours: 10, trust: 0.71 },
    { name: 'Pooja Kanwar',    skills: ['Shelter', 'Construction', 'Logistics'], status: 'offline',   loc: L.sodala,       hours: 2,  trust: 0.60 },
  ];

  return defs.map((d, i) => {
    const loc = jitter(d.loc, 600);
    const isBurntOut = d.status === 'resting';
    return {
      name: d.name,
      skills: d.skills,
      languages: ['Hindi', 'English'],
      transportation_mode: ['walk', 'bicycle', 'motorcycle', 'car', 'public_transit'][i % 5],
      last_known_location: geoPoint(loc),
      service_radius: 10 + (i % 3) * 5,
      current_status: d.status,
      wellness_score: isBurntOut ? 0.22 : Math.round((0.6 + Math.random() * 0.38) * 100) / 100,
      trust_score: d.trust,
      hours_last_7_days: d.hours,
      consecutive_high_urgency_count: isBurntOut ? 5 : Math.floor(Math.random() * 3),
      total_assignments: 5 + i * 3,
      total_resolved: 3 + i * 2,
      mandatory_rest_until: isBurntOut ? new Date(Date.now() + 6 * 3_600_000) : null,
      wellness_flags: isBurntOut
        ? [{ type: 'overwork', reason: `${d.hours}h worked in 7 days — mandatory rest`, flagged_at: new Date() }]
        : [],
      contact_channels: { sms: `+91-98000${String(i).padStart(5, '0')}` },
      availability_windows: [
        { day: ['mon', 'tue', 'wed', 'thu', 'fri'][i % 5], start: '09:00', end: '18:00' },
        { day: ['sat', 'sun'][i % 2], start: '10:00', end: '16:00' },
      ],
    };
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 2. INCIDENTS — 12, with mixed statuses and urgency tiers
//    Critical  = impact_score >= 0.50  (dashboard "Critical" card)
//    Elevated  = impact_score  0.25–0.49 (dashboard "Elevated" card)
//    Routine   = impact_score  < 0.25  (dashboard "Routine" card)
//    Statuses used: reported (Unassigned), assigned (Assigned), resolved
// ════════════════════════════════════════════════════════════════════════════

function buildIncidents(volunteerIds) {
  const defs = [
    // ── CRITICAL + Unassigned ────────────────────────────────────────────
    {
      category: 'Safety', severity: 9, people: 6, impact_score: 0.82,
      status: 'reported', loc: L.baniPark,
      resource_needs: ['Fire Brigade', 'Ambulance'],
      desc: 'House fire in Bani Park. Family of 6 including a pregnant woman are trapped inside. Fire brigade delayed.',
      minutesAgo: 2,
    },
    {
      category: 'Health', severity: 10, people: 1, impact_score: 0.77,
      status: 'reported', loc: L.tonkRoad,
      resource_needs: ['Ambulance', 'First Aid'],
      desc: 'Construction worker fell from third floor at Tonk Road site. Bleeding heavily from head, possibly unconscious.',
      minutesAgo: 5,
    },
    {
      category: 'Safety', severity: 10, people: 40, impact_score: 0.75,
      status: 'reported', loc: L.cHandPole,
      resource_needs: ['Fire Brigade', 'Evacuation Team'],
      desc: 'Gas cylinder leak at a restaurant near Chandpole Gate. Fire brigade not yet on scene. Residents evacuating.',
      minutesAgo: 8,
    },

    // ── CRITICAL + Assigned ──────────────────────────────────────────────
    {
      category: 'Food', severity: 9, people: 100, impact_score: 0.68,
      status: 'assigned', loc: L.jawaharCircle,
      resource_needs: ['Food Packets', 'Drinking Water'],
      desc: 'Around 30 migrant families at Jawahar Circle have not eaten since yesterday. Mostly women and children.',
      assignVolIdx: 1, // Priya Gupta — Food/Logistics
      minutesAgo: 45,
    },
    {
      category: 'Infrastructure', severity: 9, people: 8, impact_score: 0.61,
      status: 'assigned', loc: L.hawaMahal,
      resource_needs: ['JCB', 'Rescue Team'],
      desc: 'Retaining wall collapsed on road near Hawa Mahal. Two vehicles buried under debris; 8 people unaccounted for.',
      assignVolIdx: 4, // Arjun Meena — Infrastructure
      minutesAgo: 20,
    },

    // ── ELEVATED + Unassigned ────────────────────────────────────────────
    {
      category: 'Water', severity: 7, people: 320, impact_score: 0.42,
      status: 'triaged', loc: L.sodala,
      resource_needs: ['Water Tanker', 'Testing Kit'],
      desc: 'Municipal water supply in Sodala has turned brown. Multiple children reporting stomach cramps. 80 families affected.',
      minutesAgo: 55,
    },
    {
      category: 'Shelter', severity: 8, people: 65, impact_score: 0.38,
      status: 'reported', loc: L.mansarovar,
      resource_needs: ['Tents', 'Blankets'],
      desc: 'Flood-displaced families sleeping under Mansarovar flyover for 3 days. Elderly man looks seriously ill.',
      minutesAgo: 100,
    },

    // ── ELEVATED + Assigned ──────────────────────────────────────────────
    {
      category: 'Health', severity: 6, people: 45, impact_score: 0.31,
      status: 'in_progress', loc: L.sikarRoad,
      resource_needs: ['Vaccines', 'Medical Team'],
      desc: 'Community health worker reports a suspected measles outbreak in the Sikar Road labor colony. 45 children affected.',
      assignVolIdx: 9, // Anjali Patel — Education/Counseling
      minutesAgo: 130,
    },

    // ── ROUTINE + Unassigned ─────────────────────────────────────────────
    {
      category: 'Infrastructure', severity: 5, people: 20, impact_score: 0.19,
      status: 'reported', loc: L.rajapark,
      resource_needs: ['Road Repair Crew'],
      desc: 'Open sewer on Raja Park main road. Pedestrians at risk of falling in after dark. Street light also broken.',
      minutesAgo: 200,
    },
    {
      category: 'Education', severity: 5, people: 40, impact_score: 0.12,
      status: 'triaged', loc: L.vaishaliNagar,
      resource_needs: ['Temporary Classrooms', 'Tarpaulin'],
      desc: 'Night school for working children in Vaishali Nagar closed due to structural issues. 40 kids without classes.',
      minutesAgo: 240,
    },

    // ── RESOLVED ─────────────────────────────────────────────────────────
    {
      category: 'Water', severity: 6, people: 60, impact_score: 0.35,
      status: 'resolved', loc: L.malviyaNagar,
      resource_needs: ['Water Tanker'],
      desc: 'Water supply disruption in Malviya Nagar sector 4. Water tanker deployed, situation resolved.',
      assignVolIdx: 2, // Vikram Singh
      minutesAgo: 360,
      resolvedAt: minsAgo(60),
    },
    {
      category: 'Health', severity: 8, people: 1, impact_score: 0.55,
      status: 'verified', loc: L.sikarRoad,
      resource_needs: ['Ambulance'],
      desc: 'Elderly tourist collapsed near Sikar Road market. First aid administered, transported to hospital. Stable.',
      assignVolIdx: 0, // Aarav Sharma — Medical
      minutesAgo: 480,
      resolvedAt: minsAgo(180),
    },
  ];

  return defs.map((d) => {
    const centroid = jitter(d.loc, 50);
    const sanitized = jitter(d.loc, 120);
    const vol = d.assignVolIdx !== undefined ? volunteerIds[d.assignVolIdx] : null;

    return {
      category: d.category,
      severity: d.severity,
      estimated_people_affected: d.people,
      resource_needs: d.resource_needs,
      location_centroid: geoPoint(centroid),
      location_bounds: {
        min_lat: centroid.lat - 0.001,
        max_lat: centroid.lat + 0.001,
        min_lng: centroid.lng - 0.001,
        max_lng: centroid.lng + 0.001,
      },
      sanitized_location: geoPoint(sanitized),
      impact_score: d.impact_score,
      score_breakdown: {
        severity:                 parseFloat((d.severity / 10).toFixed(2)),
        people_factor:            parseFloat((Math.log10(d.people + 1) / 3).toFixed(2)),
        vulnerability_multiplier: 1.0,
        time_decay:               parseFloat((1 - d.minutesAgo / 600).toFixed(2)),
        resource_scarcity:        0.5,
        historical_pattern:       0.3,
        weights: { severity: 0.35, people: 0.20, vulnerability: 0.15, decay: 0.15, scarcity: 0.10, history: 0.05 },
        total: d.impact_score,
      },
      status: d.status,
      assigned_volunteer_ids: vol ? [vol] : [],
      assignment_history: vol
        ? [{ volunteer_id: vol.toString(), assigned_at: minsAgo(d.minutesAgo - 10), status: 'active' }]
        : [],
      resolved_at:         d.resolvedAt || null,
      verification_status: ['resolved', 'verified'].includes(d.status) ? 'verified' : 'pending',
      escalation_level: 0,
      created_at: minsAgo(d.minutesAgo),
    };
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 3. REPORTS — 12, one per incident
//    Two of them include audio media_refs to exercise the audio approval UI.
// ════════════════════════════════════════════════════════════════════════════

function buildReports(incidentDocs) {
  const workerIds = [
    'fw-hawa-1', 'fw-tonk-1', 'fw-chandpole-1', 'fw-jawahar-1', 'fw-hawa-2',
    'fw-sodala-1', 'fw-mansarovar-1', 'fw-sikar-1', 'fw-rajapark-1', 'fw-vaishali-1',
    'fw-malviya-1', 'fw-sikar-2',
  ];

  const texts = [
    'Fire broke out in a two-story house in Bani Park. Family of 6 including a pregnant woman still inside. Fire brigade hasn\'t arrived.',
    'Construction worker fell from third floor at the Tonk Road site. Bleeding heavily from head. Urgent ambulance needed.',
    'Strong smell of cooking gas in the lane near Chandpole Gate. People evacuating. Cylinder leak at a restaurant, fire brigade not on site.',
    'Around 30 families at Jawahar Circle have not eaten since yesterday. Mostly women and kids. Need food packets urgently.',
    'Retaining wall collapsed near Hawa Mahal. Two vehicles buried under debris. 8 people unaccounted for. Need rescue team immediately.',
    'Municipal water supply in Sodala has turned brown. Multiple children reporting stomach cramps. 80 families without clean water.',
    'Flood-displaced families sleeping under Mansarovar flyover for 3 days. Elderly man appears seriously ill.',
    'Community health worker reports suspected measles in Sikar Road labor colony. Approximately 45 children affected.',
    'Open sewer on Raja Park main road. Pedestrians falling in. Street light also broken — dangerous at night.',
    'Night school in Vaishali Nagar closed due to structural issues. 40 working children have nowhere to go for evening classes.',
    'Water tanker not arrived in 4 days to Malviya Nagar sector 4. 60 families without water supply.',
    'Elderly tourist collapsed near Sikar Road market. No doctor nearby. Crowd gathered. Ambulance called but not arrived.',
  ];

  const categories = [
    'Safety', 'Health', 'Safety', 'Food', 'Infrastructure',
    'Water', 'Shelter', 'Health', 'Infrastructure', 'Education',
    'Water', 'Health',
  ];

  const urgencyScores = [9, 10, 9, 8, 9, 7, 7, 6, 5, 5, 6, 8];
  const peopleAffected = [6, 1, 40, 100, 8, 320, 65, 45, 20, 40, 60, 1];

  // Reports 6 and 11 (0-indexed) get audio media refs to test the approval UI.
  const audioReportIndices = new Set([5, 11]);

  return incidentDocs.map((incident, i) => {
    const coords = jitter(
      { lat: incident.location_centroid.coordinates[1], lng: incident.location_centroid.coordinates[0] },
      80,
    );

    const hasAudio = audioReportIndices.has(i);
    const mediaRefs = hasAudio
      ? [{ filename: `audio-report-${String(i + 1).padStart(3, '0')}.webm`, mimetype: 'audio/webm', size: 24576 + i * 512 }]
      : [];

    return {
      worker_id: workerIds[i],
      original_text: texts[i],
      gps_coordinates: { lat: coords.lat, lng: coords.lng },
      media_refs: mediaRefs,
      extracted_fields: {
        category: categories[i],
        urgency_score: urgencyScores[i],
        people_affected: peopleAffected[i],
        summarized_need: texts[i].split('.')[0] + '.',
        model_version: 'seed-v1',
      },
      status: 'clustered',
      approvalStatus: hasAudio ? 'pending' : 'approved',
      incident_id: incident._id,
      submitted_at: incident.created_at,
      received_at: incident.created_at,
    };
  });
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[seed] MONGODB_URI not set — check your .env file.');
    process.exit(1);
  }

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║       SRA — QUICK-START SEEDER                  ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  await mongoose.connect(uri);
  console.log('[seed] Connected to MongoDB:', uri);

  // ── 1. Clean slate ────────────────────────────────────────────────────────
  console.log('\n[seed] Clearing existing data...');
  const [delV, delI, delR] = await Promise.all([
    Volunteer.deleteMany({}),
    Incident.deleteMany({}),
    Report.deleteMany({}),
  ]);
  console.log(`  volunteers removed: ${delV.deletedCount}`);
  console.log(`  incidents  removed: ${delI.deletedCount}`);
  console.log(`  reports    removed: ${delR.deletedCount}`);

  // ── 2. Volunteers ─────────────────────────────────────────────────────────
  console.log('\n[seed] Inserting volunteers...');
  const volunteers = await Volunteer.insertMany(buildVolunteers());
  const volunteerIds = volunteers.map((v) => v._id);
  const statusCounts = volunteers.reduce((acc, v) => {
    acc[v.current_status] = (acc[v.current_status] || 0) + 1;
    return acc;
  }, {});
  console.log(`  ${volunteers.length} volunteers created`);
  console.log(`  available: ${statusCounts.available || 0}  assigned: ${statusCounts.assigned || 0}  resting: ${statusCounts.resting || 0}  offline: ${statusCounts.offline || 0}`);

  // ── 3. Incidents ──────────────────────────────────────────────────────────
  console.log('\n[seed] Inserting incidents...');
  const incidents = await Incident.insertMany(buildIncidents(volunteerIds));
  const iStatusCounts = incidents.reduce((acc, inc) => {
    acc[inc.status] = (acc[inc.status] || 0) + 1;
    return acc;
  }, {});
  const critCount = incidents.filter((i) => i.impact_score >= 0.5).length;
  const elevCount = incidents.filter((i) => i.impact_score >= 0.25 && i.impact_score < 0.5).length;
  const routCount = incidents.filter((i) => i.impact_score < 0.25).length;
  console.log(`  ${incidents.length} incidents created`);
  console.log(`  urgency  — critical: ${critCount}  elevated: ${elevCount}  routine: ${routCount}`);
  console.log(`  statuses — ${Object.entries(iStatusCounts).map(([k, v]) => `${k}: ${v}`).join('  ')}`);

  // ── 4. Reports ────────────────────────────────────────────────────────────
  console.log('\n[seed] Inserting field reports...');
  const reports = await Report.insertMany(buildReports(incidents));
  const audioCount = reports.filter((r) => r.media_refs.length > 0).length;
  console.log(`  ${reports.length} reports created`);
  console.log(`  ${audioCount} with audio media (approvalStatus: pending) for the approval UI`);

  // ── 5. Summary ────────────────────────────────────────────────────────────
  console.log('\n┌──────────────────────────────────────────────────┐');
  console.log('│  SEED COMPLETE                                   │');
  console.log('├──────────────────────────────────────────────────┤');
  console.log(`│  Volunteers : ${String(volunteers.length).padEnd(34)}│`);
  console.log(`│  Incidents  : ${String(incidents.length).padEnd(34)}│`);
  console.log(`│  Reports    : ${String(reports.length).padEnd(34)}│`);
  console.log('└──────────────────────────────────────────────────┘\n');

  await mongoose.connection.close();
  console.log('[seed] Connection closed. Done.\n');
}

main().catch((err) => {
  console.error('[seed] Fatal error:', err);
  mongoose.connection.close();
  process.exit(1);
});
