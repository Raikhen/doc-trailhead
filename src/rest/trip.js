import * as sqlite from '../services/sqlite.js'
import * as utils from '../utils.js'

function getTripData (tripId) {
  const trip = sqlite.get(`
    SELECT
      trips.id as trip_id,
      title,
      clubs.name as club,
      start_time,
      end_time,
      pickup,
      description,
      dropoff,
      location,
      users.name as owner_name,
      experience_needed,
      cost,
      vehiclerequests.id as vehiclerequest_id,
      vehiclerequests.is_approved as vehiclerequest_status,
      member_gear_approved,
      group_gear_approved
    FROM trips
    LEFT JOIN clubs ON clubs.id = trips.club
    LEFT JOIN users ON users.id = trips.owner
    LEFT JOIN vehiclerequests ON vehiclerequests.trip = trips.id
    WHERE trips.id = ?
  `, tripId)

  const leaderNames = sqlite.get(`
  SELECT group_concat(name, ', ') as names
  FROM trip_members
  LEFT JOIN users ON users.id = user
  WHERE leader = 1 AND trip = ?
  `, tripId).names

  const members = sqlite.all(`
  SELECT
    users.id,
    name,
    leader,
    pending,
    iif(trips.start_time < unixepoch() * 1000,
        '-',
        iif(attended = 0, 'No', 'Yes')) as attended,
    allergies_dietary_restrictions,
    medical_conditions
  FROM trip_members
  LEFT JOIN trips ON trips.id = trip_members.trip
  LEFT JOIN users ON users.id = trip_members.user
  WHERE trip = ?
  ORDER BY leader DESC, name
  `, tripId)

  const membersWithGear = members.map(member => {
    const gearRequests = sqlite.all(`
    SELECT name
    FROM member_gear_requests
    LEFT JOIN trip_required_gear ON trip_required_gear.id = member_gear_requests.gear
    WHERE member_gear_requests.trip = ? AND user = ?
    `, tripId, member.id)
    const requested_gear = gearRequests.map(({ name }) => `<li>${name}`).join('\n')
    return { ...member, requested_gear }
  })

  const individualGearRequests = sqlite.all(`
    SELECT name, count(gear) as quantity
    FROM member_gear_requests
    LEFT JOIN trip_required_gear ON trip_required_gear.id = member_gear_requests.gear
    WHERE member_gear_requests.trip = ?
    GROUP BY gear
    ORDER BY quantity DESC
  `, tripId)

  const groupGearRequests = sqlite.all(`
    SELECT name, quantity FROM group_gear_requests WHERE trip = ? ORDER BY quantity DESC
  `, tripId)

  const tripPcardRequest = sqlite.get(`
    SELECT assigned_pcard, is_approved, snacks, breakfast, lunch, dinner, other_costs
    FROM trip_pcard_requests
    WHERE trip = ?
  `, tripId)

  const requestedVehicles = sqlite.all(`
    SELECT
      type,
      details,
      pickup_time,
      return_time,
      iif(trailer_needed = 1, 'Yes', 'No') as trailer_needed,
      iif(pass_needed = 1, 'Yes', 'No') as pass_needed
    FROM requested_vehicles
    WHERE vehiclerequest = ?
  `, trip.vehiclerequest_id)
  // Note the ORDER BY ensures that the response_index is lined up
  const assignedVehicles = sqlite.all(`
    SELECT
      vehicles.name as name,
      vehicle_key,
      pickup_time as assigned_pickup_time,
      return_time as assigned_return_time
    FROM assignments
    LEFT JOIN vehicles ON vehicles.id = assignments.vehicle
    WHERE vehiclerequest = ?
    ORDER BY response_index ASC
  `, trip.vehiclerequest_id)

  // This is annoying holdover from the old frontend
  // Once we've migrated to the new frontend we can properly link these in the db
  const vehicles = requestedVehicles.map((requestedVehicle, index) => {
    return { ...requestedVehicle, ...assignedVehicles.at(index) }
  })

  trip.start_time = utils.getLongTimeElement(trip.start_time)
  trip.end_time = utils.getLongTimeElement(trip.end_time)
  trip.trip_status = utils.getBadgeImgElement('approved') // TODO dynamically create
  trip.leader_names = leaderNames
  trip.attending = membersWithGear.filter(member => member.pending === 0)
  trip.pending = membersWithGear.filter(member => member.pending === 1)
  trip.individual_gear = individualGearRequests
  trip.group_gear = groupGearRequests
  trip.individual_gear_status = individualGearRequests.length > 0
    ? utils.getBadgeImgElement(trip.member_gear_approved || 'pending')
    : '<span>-</span>'
  trip.group_gear_status = groupGearRequests.length > 0
    ? utils.getBadgeImgElement(trip.group_gear_approved || 'pending')
    : '<span>-</span>'
  trip.pcard_request = tripPcardRequest
  trip.vehiclerequest_status = utils.getBadgeImgElement(trip.vehiclerequest_status)

  trip.requested_vehicles = vehicles.map(vehicle => {
    return {
      ...vehicle,
      pickup_time: utils.getLongTimeElement(vehicle.pickup_time),
      return_time: utils.getLongTimeElement(vehicle.return_time),
      assigned_pickup_time: utils.getLongTimeElement(vehicle.assigned_pickup_time),
      assigned_return_time: utils.getLongTimeElement(vehicle.assigned_return_time)
    }
  })
  if (trip.pcard_request) {
    const is_approved = trip.pcard_request.is_approved || 'pending'
    trip.pcard_request.status = utils.getBadgeImgElement(is_approved)
  }

  return trip
}

export function get (req, res) {
  const tripId = req.params.id
  const trip = getTripData(tripId)
  res.render('trip.njs', trip)
}

// TODO refactor this with universal validation put individual handlers
function updateTripMembers (req, res, field, value) {
  const { tripId, userId } = req.params
  if (!tripId || !userId) {
    console.warn('Bad request detected', tripId, userId)
    return res.sendStatus(400)
  }

  sqlite
    .run(`UPDATE trip_members SET ${field} = ${value} WHERE trip = ? and user = ?`, tripId, userId)

  const trip = getTripData(tripId)
  return res.render('partials/long-trip-card.njs', trip)
}

export const makeLeader = (req, res) => updateTripMembers(req, res, 'leader', 1)
export const demote = (req, res) => updateTripMembers(req, res, 'leader', 0)
export const admit = (req, res) => updateTripMembers(req, res, 'pending', 0)
export const sendToWaitlist = (req, res) => updateTripMembers(req, res, 'pending', 1)

export function reject (req, res) {
  const { tripId, userId } = req.params
  if (!tripId || !userId || typeof tripId !== 'number' || typeof userId !== 'number') {
    console.warn('Bad request detected', tripId, userId)
    return res.sendStatus(400)
  }

  sqlite.run('DELETE FROM trip_members WHERE trip = ? and user = ?', tripId, userId)
  const trip = getTripData(tripId)
  return res.render('partials/long-trip-card.njs', trip)
}
