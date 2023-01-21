import * as sqlite from '../services/sqlite.js'
import * as tripStatusView from '../views/trip-status.js'

export function checkOut (req, res) {
  const tripId = req.params.tripId
  sqlite.run('UPDATE trips SET left = TRUE WHERE id = ?', tripId)
  res.set('HX-Redirect', `/trip/${tripId}/check-out`)
  res.sendStatus(200)
}

export function deleteCheckOut (req, res) {
  const tripId = req.params.tripId
  sqlite.run('UPDATE trips SET left = FALSE WHERE id = ?', tripId)
  res.set('HX-Redirect', `/trip/${tripId}/check-out`)
  res.sendStatus(200)
}

export function markUserPresent (req, res) {
  const { tripId, memberId } = req.params
  const info = sqlite.run(`
    UPDATE trip_members
    SET attended = TRUE
    WHERE trip = ? AND user = ? AND pending = 0
  `, tripId, memberId)

  if (info.changes !== 1) {
    console.error(`Attempted to mark member ${memberId} present on trip ${tripId}`)
    console.error('Unexpected number of changes based on request: ', info.changes)
  }

  tripStatusView.renderAttendanceTable(res, tripId)
}

export function markUserAbsent (req, res) {
  const { tripId, memberId } = req.params
  const info = sqlite.run(`
    UPDATE trip_members
    SET attended = FALSE
    WHERE trip = ? AND user = ? AND pending = 0
  `, tripId, memberId)

  if (info.changes !== 1) {
    console.error(`Attempted to mark member ${memberId} present on trip ${tripId}`)
    console.error('Unexpected number of changes based on request: ', info.changes)
  }
  tripStatusView.renderAttendanceTable(res, tripId)
}