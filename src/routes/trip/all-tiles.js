import * as utils from '../../utils.js'

export function get(req, res) {
  // Params
  const beginnersOnly = req.query?.beginner_friendly === 'on'
  const search = req.query?.search
  const when = req.query?.when
  const showPrivate = res.locals.is_opo

  // Get all the clubs that were selected
  const clubIds = Object.keys(req.query)
    .filter(key => key.startsWith('club_'))
    .map(key => parseInt(key.slice(5)))

  // Time constraints
  const date = new Date()
  const now = date.getTime()
  const oneDay = 24 * 60 * 60 * 1000
  const startOfTomorrow = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() + oneDay
  const startOfNextSevenDays = now + 7 * oneDay

  let timeConstraint = ''

  if (when === 'today') {
    timeConstraint = `AND start_time >= ${now} AND start_time < ${startOfTomorrow}`
  } else if (when === 'tomorrow') {
    timeConstraint = `AND start_time >= ${startOfTomorrow} AND start_time < ${startOfTomorrow + oneDay}`
  } else if (when === 'next-seven-days') {
    timeConstraint = `AND start_time >= ${now} AND start_time < ${startOfNextSevenDays}`
  } else if (when === 'all') {
    timeConstraint = ''
  } else {
    timeConstraint = `AND start_time >= ${now}`
  }

  const clubConstraint = clubIds.length > 0 ? `AND trips.club IN (${clubIds.join(',')})` : ''

  const publicTrips = req.db.all(`
    SELECT trips.id, title, users.name as owner, location, start_time, end_time, description,
      coalesce(clubs.name, 'None') as club
    FROM trips
    LEFT JOIN users on trips.owner = users.id
    LEFT JOIN clubs on trips.club = clubs.id
    WHERE 1=1
    ${showPrivate ? '' : 'AND private = 0'}
    ${beginnersOnly ? 'AND experience_needed = 0' : ''}
    ${timeConstraint}
    ${clubConstraint}
    ${search ? `AND (title LIKE '%${search}%' OR description LIKE '%${search}%')` : ''}
    ORDER BY start_time ASC
  `)

  const trips = publicTrips.map(utils.formatForTripForTables)

  res.render('trip/all-tiles.njk', { trips })
}
