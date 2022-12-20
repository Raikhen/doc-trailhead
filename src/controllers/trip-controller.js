import * as db from '../services/sqlite.js'

import * as Users from '../controllers/user-controller.js'
import * as VehicleRequests from './vehicle-request-controller.js'

import * as constants from '../constants.js'
import * as mailer from '../services/mailer.js'

async function sendLeadersEmail (tripID, subject, message) {
  const trip = db.getTripById(tripID)
  const leaderEmails = db.getUserEmails(trip.leaders)
  return mailer.send({ address: leaderEmails, subject, message })
}

export async function getPublicTrips (_req, res) {
  try {
    return res.json(db.getPublicTrips())
  } catch (error) {
    console.error(error)
    return res.status(500).send(error.message)
  }
}

export async function getTrips (req, res) {
  const getPastTrips = req.query.getPastTrips !== 'false'
  const allTrips = db.getAllTrips(getPastTrips)
  return res.json(allTrips)
}

/**
 * Fetches only trips that have gear, P-Card, or vehicle requests.
 */
export async function handleGetOpoTrips (req, res) {
  const getPastTrips = req.query.getOldTrips !== 'false'
  const allTrips = db.getAllTrips(getPastTrips)

  const filteredTrips = allTrips.filter(trip => {
    const { trippeeGearStatus, gearStatus, pcardStatus, vehicleStatus } = trip
    return trippeeGearStatus !== 'N/A' ||
      gearStatus !== 'N/A' ||
      pcardStatus !== 'N/A' ||
      vehicleStatus !== 'N/A'
  })

  return res.json(filteredTrips)
}

/**
 * Fetches a single trip with all fields populated.
 */
export async function getTrip (req, res) {
  const tripId = req.params.tripID
  const requestingUser = req.user
  const trip = db.getFullTripView(tripId, requestingUser)
  return res.json(trip)
}

export async function createTrip (creator, data) {
  // Creates the new trip
  const trip = {
    title: data.title || 'Untitled trip',
    private: data.private || false,
    start_time: constants.createDateObject(data.startDate, data.startTime, data.timezone),
    end_time: constants.createDateObject(data.endDate, data.endTime, data.timezone),
    owner: creator.id,
    description: data.description,
    club: data.club._id,
    cost: data.cost || 0,
    experience_needed: data.experienceNeeded || false,
    location: data.location,
    pickup: data.pickup,
    dropoff: data.dropoff,
    mileage: data.mileage,
    coleader_can_edit: data.coLeaderCanEditTrip || false,
    opo_gear_requests: data.gearRequests,
    trippee_gear: data.trippeeGear,
    pcard: data.pcard
  }

  if (data.gearRequests.length > 0) trip.gear_status = 'pending'
  if (data.trippeeGear.length > 0) trip.trippee_gear_status = 'pending'
  if (data.pcard.length > 0) trip.pcard_status = 'pending'

  const leaders = data.leaders
    .map(db.getUserByEmail)
    .map(user => user.id)

  const tripId = db.insertTrip(trip, leaders)

  const leaderEmails = [creator.email] // Used to send out initial email
  const savedTrip = { ...trip, id: tripId }
  await mailer.sendNewTripEmail(savedTrip, leaderEmails, creator)

  // If vehciles are specified, create a new Vehicle Request
  if (data.vehicles.length > 0) {
    const { mileage, description, vehicles } = data
    const vehicleRequest = {
      requester: creator.id,
      request_details: description,
      mileage,
      trip: tripId,
      request_type: 'TRIP'
    }

    const requestedVehicles = vehicles.map((vehicle) => ({
      type: vehicle.type,
      trailer_needed: vehicle.trailerNeeded,
      pass_needed: vehicle.passNeeded,
      recurring_vehicle: vehicle.recurringVehicle,
      pickup_time: constants.createDateObject(vehicle.pickupDate, vehicle.pickupTime),
      return_time: constants.createDateObject(vehicle.returnDate, vehicle.returnTime)
    }))

    try {
      const vehicleRequestId = db.createVehicleRequestForTrip(vehicleRequest, requestedVehicles)
      await mailer.sendNewVehicleRequestEmail(trip, leaderEmails, vehicleRequestId)
      db.markTripVehicleStatusPending(tripId)

      return db.getTripById(tripId)
    } catch (error) {
      throw new Error(`${'Trip successfully created, but error creating associated vehicle request for trip:'} ${error.toString()}`)
    }
  } else {
    return savedTrip
  }
}

export async function updateTrip (req, res) {
  const trip = db.getTripById(req.params.tripID)
  const isOwner = trip.owner.id === req.user.id
  const isLeader = trip.leaders.some(user => user.id === req.user.id)
  const isOPO = req.user.role === 'OPO'
  if (!isOwner && !isLeader && !isOPO) {
    return res.status(403).send('You must be a leader on the trip to update it.')
  }

  trip.title = req.body.title
  trip.private = req.body.private
  trip.returned = req.body.returned
  trip.start_time = constants.createDateObject(req.body.startDate, req.body.startTime)
  trip.end_time = constants.createDateObject(req.body.endDate, req.body.endTime)
  trip.description = req.body.description
  trip.coleader_can_edit = req.body.coLeaderCanEditTrip
  trip.club = req.body.club._id
  trip.location = req.body.location
  trip.pickup = req.body.pickup
  trip.dropoff = req.body.dropoff
  trip.cost = req.body.cost
  trip.experience_needed = req.body.experienceNeeded
  trip.opo_gear_requests = req.body.gearRequests
  trip.trippee_gear = req.body.trippeeGear
  trip.pcard = req.body.pcard

  trip.members.concat(trip.pending).forEach((person) => {
    db.updateRequestedGear(trip.id, person.id, person.requestedGear)
  })

  if (trip.gearStatus === 'N/A' && req.body.gearRequests.length > 0) {
    trip.gear_status = 'pending'
  } else if (trip.gearStatus === 'pending' && req.body.gearRequests.length === 0) {
    trip.gear_status = 'N/A'
  }

  if (trip.trippeeGearStatus === 'N/A' && req.body.trippeeGear.length > 0) {
    trip.trippee_gear_status = 'pending'
  } else if (trip.trippeeGearStatus === 'pending' && req.body.trippeeGear.length === 0) {
    trip.trippee_gear_status = 'N/A'
  }

  if (trip.pcardStatus === 'N/A' && req.body.pcard.length > 0) {
    trip.pcard_status = 'pending'
  } else if (trip.pcardStatus === 'pending' && req.body.pcard.length === 0) {
    trip.pcard_status = 'N/A'
  }

  if (req.body.changedVehicles) {
    const { vehicleReqId, mileage, noOfPeople, vehicles } = req.body
    const vehicleRequest = {
      id: vehicleReqId,
      requester: req.user._id,
      request_details: req.body.description,
      mileage,
      num_participants: noOfPeople,
      trip: req.params.tripID,
      request_type: 'TRIP',
      status: 'pending'
    }

    if (trip.vehicle_status === 'N/A' && vehicles.length > 0) {
      db.createVehicleRequestForTrip(vehicleRequest, vehicles)
      trip.vehicle_status = 'pending'
    } else {
      // If the request was previously approved, delete associated assignements and send an email
      if (trip.vehicle_status === 'approved') {
        const info = db.deleteAllAssignmentsForVehicleRequest(vehicleReqId)
        if (info.changes > 0) await mailer.sendVehicleRequestChangedEmail(vehicleRequest)
      }

      // If there are no requests, delete the request entirely, otherwise update and set to pending
      if (vehicles.length === 0) {
        db.deleteVehicleRequest(vehicleReqId)
        trip.vehicle_status = 'N/A'
      } else {
        db.updateVehicleRequest(vehicleRequest)
        trip.vehicle_status = 'pending'
      }
    }
  }

  const { leaders } = req.body
  trip.leaders = leaders.map(db.getUserByEmail).map(user => user.id)
  if (trip.leaders.length < 1) {
    console.error(`ERROR: attempted to save a trip without a leader for trip ${req.params.tripID}`)
    return res.status(400).send('Cannot save trip with no leader')
  }

  db.replaceTripLeaders(trip.id, trip.leaders)
  db.updateTrip(trip)
  db.updateTripGearAndStatus(trip.id)
  const savedTrip = db.getTripById(trip.id)
  return res.json(savedTrip)
}

/**
 * Deletes a trip.
 */
export async function deleteTrip (req, res) {
  const userId = req.user.id
  const tripId = req.params.tripID
  const trip = db.getTripById(tripId)

  const isLeader = trip.leaders.includes(userId)
  const isOpo = req.user.role === 'OPO'
  if (!isLeader && !isOpo) {
    return res.status(422).send('You must be a leader on the trip or OPO staff')
  }

  db.deleteTrip(trip.id)

  const owner = db.getUserById(trip.owner)
  const members = [...trip.members, ...trip.pending]
  const trippeeIds = members.map(member => member.user.id)
  const trippeeEmails = db.getUserEmails(trippeeIds)
  mailer.sendTripDeletedEmail(trip, owner.email, trippeeEmails, req.body.reason)
    .catch(err => {
      console.error(`Failed to send Trip Deleted Email for trip ${trip._id}`, err)
    })

  const vehicleRequest = db.getVehicleRequestByTripId(trip.id)
  if (vehicleRequest) {
    const request = VehicleRequests.deleteOne(trip.vehicleRequest, 'Associated trip has been deleted')
    await mailer.sendTripVehicleRequestDeletedEmail(trip, [owner.email], request.number)
    return res.json({ message: 'Trip and associated vehicle request successfully' })
  } else {
    return res.json({ message: 'Trip removed successfully' })
  }
}

/**
 * TRIP GEAR
 */

function updateTripGearAndStatus (tripId) {
  const trip = db.getTripById(tripId)
  const newGear = trip.trippeeGear.map((gear) => {
    let quantity = 0
    for (const member in trip.members) {
      for (const memberGearRequest in member.requestedGear) {
        if (memberGearRequest.gearId === gear._id.toString(0)) quantity += 1
      }
    }
    return { ...gear, quantity }
  })

  // This is a copied bit that I still don't like. This whole way of doing gear is a little fucked
  const wasApproved = trip.trippeeGearStatus === 'approved'
  const hasChanged = trip.trippeeGear.length !== newGear.length ||
    !trip.trippeeGear
      .map((o, i) => [o, trip.trippeeGear[i]])
      .every((combined) => (combined[0].name === combined[1].name && combined[0].quantity >= combined[1].quantity && combined[0].sizeType === combined[1].sizeType))

  let trippee_gear_status = trip.trippeeGearStatus
  if (wasApproved && hasChanged) {
    trippee_gear_status = 'pending'
    sendLeadersEmail(trip._id, `Trip #${trip.number}: Trippee gear requests un-approved`, `Hello,\n\nYour [Trip #${trip.number}: ${trip.title}]'s trippee (not group) gear requests was originally approved by OPO staff, but since a new trippee was admitted who requested additional gear, it has automatically been sent back to review to OPO staff to ensure we have enough.\nCurrently, your trip's status has been changed back to pending, and you should await re-approval before heading out.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`)
    mailer.sendGearRequiresReapprovalNotice(trip)
  }

  db.updateTrip({ id: tripId, trippee_gear: newGear, trippee_gear_status })
}

/**
 * Allows a user - both pending and approved - to edit their gear requests.
 */
export async function editUserGear (req, res) {
  const tripId = req.params.tripID
  const userId = req.user.id
  const requested_gear = req.body.trippeeGear
  const trip = db.getTripById(tripId)
  const tripMember = db.getTripMember(tripId, userId)

  db.updateTripMemberGearRequest(tripId, userId, requested_gear)

  if (tripMember.pending === false) {
    const leaderEmails = db.getUserEmails(trip.leaders)
    const user = db.getUserById(tripMember.user)
    mailer.sendGearRequestChangedEmail(trip, leaderEmails, user)
  }

  updateTripGearAndStatus(tripId)
  const updatedTrip = db.getFullTripView(tripId, req.params.user)
  return res.json(updatedTrip)
}

/**
 * Puts a trippee on the pending list.
 * Sends an email confirmation to trippee and notice to all leaders and co-leaders.
 * @param {String} tripId
 * @param {String} userId
 * @param {} requested_gear
 */
export async function apply (tripId, userId, requested_gear) {
  const tripMember = db.getTripMember(tripId, userId)
  if (tripMember) throw new Error(`User ${userId} is already on the trip`)
  db.insertPendingTripMember(tripId, userId, requested_gear)

  const trip = db.getTripById(tripId)
  const newMember = db.getUserById(userId)
  const owner = db.getUserById(trip.owner)
  mailer.sendTripApplicationConfirmation(trip, newMember, owner.email)
}

/**
 * Moves a pending member to the approved list, while adding their gear requests to the trip's
 * total.
 * Sends approved notification email to the trippee and a notice to all leaders and co-leaders.
 * @param {String} tripId The ID of the trip to join
 * @param {String} userId The user ID who is requesting to join
 */
export async function admit (tripId, userId) {
  // Admit user
  const tripMember = db.getTripMember(tripId, userId)
  if (!tripMember) throw new Error('This user is not yet on the pending list for this trip')
  if (!tripMember.pending) throw new Error('This user is already approved to be on the trip')
  db.admitTripMember(tripId, userId)

  // Update trippee gear
  const trip = db.getTripById(tripId)
  updateTripGearAndStatus(tripId)

  // Send approval email to user
  const member = db.getUserById(userId)
  const owner = db.getUserById(trip.owner)
  return mailer.sendTripApprovalEmail(trip, member, owner.email)
}

/**
 * Moves a currently approved trippee to the pending list.
 * Removes trippees gear requests from the group list.
 * Sends all trip leaders and co-leaders a notification email.
 * @param {String} tripId The ID of the trip to leave
 * @param {String} userId The user ID who is leaving
 */
export async function unadmit (tripId, userId) {
  // Remove user from trip
  const tripMember = db.getTripMember(tripId, userId)
  if (!tripMember) throw new Error('This user was not on the trip before')
  if (tripMember.pending) throw new Error('This user was already on the pending list')
  db.unadmitTripMember(tripId, userId)

  // Update gear
  const trip = db.getTripById(tripId)
  updateTripGearAndStatus(tripId)

  // Inform user of their removal
  const user = db.getUserById(userId)
  const owner = db.getUserById(trip.owner)
  return mailer.sendTripRemovalEmail(trip, user, owner.email)
}

/**
 * Removes a currently pending trippee.
 * Sends all trip leaders and co-leaders a notification email.
 * @param {String} tripId The ID of the trip to leave
 * @param {String} userId The user ID who is leaving
 */
export async function reject (tripId, userId) {
  const tripMember = db.getTripMember(tripId, userId)
  if (!tripMember) throw new Error('This user was not on the trip before')
  db.deleteTripMember(tripId, userId)

  const trip = db.getTripById(tripId)
  const user = db.getUserById(userId)
  const owner = db.getUserById(trip.owner)
  return mailer.sendTripTooFullEmail(trip, user, owner.email)
}

/**
 * Processes request from trippee to leave trip.
 * If the trippee was approved, removes all gear requested by trippee in the group list and sends email alert to all trip leaders and co-leaders.
 * @param {String} tripId The ID of the trip to leave from
 * @param {String} leavingUserID The ID of the user leaving
 */
export async function leave (tripId, userId) {
  const trip = db.getTripById(tripId)

  const tripMember = db.getTripMember(tripId, userId)
  db.deleteTripMember(tripId, userId)
  if (!tripMember.pending) {
    const leaderEmails = db.getUserEmails(trip.leaders)
    const leavingUser = db.getUserById(userId)
    mailer.sendUserLeftEmail(trip, leaderEmails, leavingUser)
  }

  updateTripGearAndStatus(tripId)
}

export async function toggleTripLeadership (req, res) {
  const tripId = req.params.tripID
  const userId = req.body.member.user.id

  const trip = db.getTripById(tripId)
  const user = db.getUserById(userId)
  const tripMember = db.getTripMember(tripId, userId)

  if (tripMember.leader) {
    mailer.sendCoLeaderRemovalNotice(trip, user)
    db.promoteTripMemberToLeader(tripId, userId)
  } else {
    mailer.sendCoLeaderConfirmation(trip, user)
    db.demoteTripLeaderToMember(tripId, userId)
  }

  const newTrip = db.getFullTripView(tripId, req.params.user)
  return res.json(newTrip)
}

/**
 * Sets the attending status for each member of trip.
 */
export async function setMemberAttendance (req, res) {
  const { tripID } = req.params
  const { memberID, status } = req.body
  db.setTripMemberAttendance(tripID, memberID, status)
  res.json({ status })
}

/**
 * TRIP STATUS
 */

/**
 * Sets the returned status for the trip.
 */
export async function toggleTripLeftStatus (req, res) {
  const tripId = req.params.tripID
  const left = req.body.status
  const now = new Date()

  db.setTripLeftStatus(tripId, left)
  const trip = db.getTripById(tripId)

  if (left) {
    // These do not toggle back - unclear if that was intentional
    db.markTripVehicleAssignmentsPickedUp(tripId)
  }

  sendLeadersEmail(trip._id, `Trip #${trip.number} ${!left ? 'un-' : ''}left`, `Hello,\n\nYou have marked your Trip #${trip.number}: ${trip.title} as just having ${!left ? 'NOT ' : ''}left ${trip.pickup} at ${constants.formatDateAndTime(now)}, and your trip is due for return at ${constants.formatDateAndTime(trip.endDateAndTime)}.\n\nIMPORTANT: within 90 minutes of returning from this trip, you must check-in all attendees here: ${constants.frontendURL}/trip-check-in/${trip._id}?token=${Users.tokenForUser(req.user._id, 'mobile', trip._id)}\n\nWe hope you enjoyed the outdoors!\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`)

  const newTrip = db.getFullTripView(tripId, req.params.user)
  res.json(newTrip)
}

/**
 * Sets the returned status for the trip.
 */
export async function toggleTripReturnedStatus (req, res) {
  const tripId = req.params.tripID
  const returned = req.body.status
  const now = new Date()

  db.setTripReturnedStatus(tripId, returned)

  if (returned) {
    // These do not toggle back - unclear if that was intentional
    db.markTripVehicleAssignmentsReturned(tripId)
  }

  const trip = db.getTripById(tripId)
  sendLeadersEmail(trip._id, `Trip #${trip.number} ${!returned ? 'un-' : ''}returned`, `Hello,\n\nYour Trip #${trip.number}: ${trip.title}, has been marked as ${!returned ? 'NOT ' : ''}returned at ${constants.formatDateAndTime(now)}. Trip details can be found at:\n\n${constants.frontendURL}/trip/${trip._id}\n\nWe hope you enjoyed the outdoors!\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`)

  // Inform OPO that the trip has been returned if it had been marked as late (3 hr) before
  if (trip.marked_late) {
    mailer.sendLateTripBackAnnouncement(trip, returned, now)
  }

  const newTrip = db.getFullTripView(tripId, req.params.user)
  res.json(newTrip)
}

/**
 * TRIP REQUESTS
 */

/**
 * OPO approves or denies a trip's general gear requests.
 * Sends notification email to all trip leaders and co-leaders.
 * @param {String} tripID The ID of the trip to edit status
 * @param {String} status String value of the new status
 */
export async function respondToGearRequest (req, res) {
  const tripId = req.params.tripID
  const { status } = req.body

  db.setTripGearStatus(tripId, status)

  let message
  switch (status) {
    case 'approved':
      message = 'got approved'
      break
    case 'denied':
      message = 'got denied'
      break
    case 'pending':
      message = 'was un-approved, pending again'
      break
    default:
      break
  }

  const trip = db.getFullTripView(tripId, req.params.user)
  const leaderEmails = db.getUserEmails(trip.leaders)
  await mailer.sendGroupGearStatusUpdate(trip, leaderEmails, message)
  return res.json(trip)
}

/**
 * OPO approves or denies a trip's trippee gear requests.
 * Sends notification email to all trip leaders and co-leaders.
 * @param {String} tripID The ID of the trip to edit status
 * @param {String} status String value of the new status
 */
export async function respondToTrippeeGearRequest (req, res) {
  const tripId = req.params.tripID
  const { status } = req.body

  db.setTripTrippeeGearStatus(tripId, status)
  let message
  switch (status) {
    case 'approved':
      message = 'got approved'
      break
    case 'denied':
      message = 'got denied'
      break
    case 'pending':
      message = 'was un-approved, pending again'
      break
    default:
      break
  }

  const trip = db.getFullTripView(tripId, req.params.user)
  const leaderEmails = db.getUserEmails(trip.leaders)
  await mailer.sendIndividualGearStatusUpdate(trip, leaderEmails, message)
  return res.json(trip)
}

/**
 * OPO assigns a P-Card to a trip or denies.
 * Sends notification email to all trip leaders and co-leaders.
 * @param {*} req
 * @param {*} res
 */
export async function respondToPCardRequest (req, res) {
  const tripId = req.params.tripID
  const { pcardStatus, pcardAssigned } = req.body
  db.setTripPcardStatus(tripId, pcardStatus, pcardAssigned)

  const trip = db.getFullTripView(tripId, req.params.user)
  const leaderEmails = db.getUserEmails(trip.leaders)
  mailer.sendPCardStatusUpdate(trip, leaderEmails)
  return res.json(trip)
}
