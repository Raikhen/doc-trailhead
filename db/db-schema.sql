/* Removed from model: */
/* responseIndex */
/* assigned_pickupDate */
/* assigned_pickupTime */
/* assigned_returnDate */
/* assigned_returnTime */
CREATE TABLE assignments (
  id INTEGER PRIMARY KEY,
  _id TEXT,
  request TEXT REFERENCES vehiclerequests ON UPDATE CASCADE ON DELETE SET NULL,
  requester TEXT REFERENCES users ON UPDATE CASCADE ON DELETE RESTRICT,
  assigned_pickupDateAndTime INTEGER,
  assigned_returnDateAndTime INTEGER,
  assigned_key TEXT,
  assigned_vehicle TEXT REFERENCES vehicles ON UPDATE CASCADE,
  picked_up INTEGER DEFAULT FALSE, /* pickedUp */
  returned INTEGER DEFAULT FALSE
) STRICT;

CREATE TABLE clubs (
  id INTEGER PRIMARY KEY,
  _id TEXT,
	name TEXT,
  active INTEGER DEFAULT TRUE
) STRICT;

CREATE TABLE globals (
  id INTEGER PRIMARY KEY,
  _id TEXT,
	trip_number_max INTEGER, /* tripNumberMax */
  vehicle_request_number_max INTEGER /* vehicleRequestNumberMax */
) STRICT;

CREATE TABLE trips (
  id INTEGER PRIMARY KEY,
  _id TEXT,
	name INTEGER,
  title TEXT DEFAULT 'Untitled trip',
  private INTEGER DEFAULT FALSE,
  past INTEGER DEFAULT FALSE,
  left INTEGER DEFAULT FALSE,
  returned INTEGER DEFAULT FALSE,
  marked_late INTEGER DEFAULT FALSE, /* markedLate */
  club TEXT REFERENCES clubs ON DELETE RESTRICT ON UPDATE CASCADE,
  owner TEXT REFERENCES clubs ON DELETE RESTRICT ON UPDATE CASCADE,
  leaders TEXT, /* [user] */
  members TEXT, /* [{user, attended, requestedGear }] */
  pending TEXT, /* [{user, requestedGear: {gearId, name}}] */
  start_datetime TEXT, /* startDateAndTime */
  end_dateime TEXT, /* endDateAndTime */
  location TEXT,
  pickup TEXT,
  dropoff TEXT,
  cost INTEGER DEFAULT 0,
  description TEXT,
  experience_needed INTEGER DEFAULT FALSE, /* experienceNeeded */
  coleader_can_edit INTEGER DEFAULT FALSE, /* coLeaderCanEditTrip */
  opo_gear_requests TEXT, /* OPOGearRequests [{ name }, quantity }] */
  trippee_gear TEXT, /* [{}]*/
  gear_status TEXT,
  trippee_gear_status TEXT,
  pcard TEXT,
  pcard_status TEXT DEFAULT 'N/A', /* enum: ['pending', 'approved', 'denied', 'N/A'] */
  pcard_assigned TEXT,
  vehicle_status TEXT DEFAULT 'N/A',
  vehicle_request TEXT REFERENCES vehiclerequests ON DELETE RESTRICT ON UPDATE CASCADE,
  sent_email TEXT
) STRICT;

CREATE TABLE users (
  id INTEGER primary key,
  _id TEXT,
  cas_id TEXT UNIQUE, /* casID */
  email TEXT UNIQUE,
  password TEXT,
  name TEXT,
  photo_url TEXT,
  pronoun TEXT,
  dash_number TEXT,
  allergies_dietary_restrictions TEXT,
  medical_conditions TEXT,
  clothe_size TEXT, /*{ type: String, enum: ['Men-XS', 'Men-S', 'Men-M', 'Men-L', 'Men-XL', 'Women-XS', 'Women-S', 'Women-M', 'Women-L', 'Women-XL'] } */
  shoe_size TEXT,
  height TEXT,
  role TEXT DEFAULT 'Trippee', /* { type: String, enum: ['Leader', 'Trippee', 'OPO'], } */
  leader_for TEXT DEFAULT '[]', /*{ type: [{ type: Schema.Types.ObjectId, ref: 'Club' }], default: [] }*/
  has_pending_leader_change INTEGER DEFAULT FALSE,
  has_pending_cert_change INTEGER DEFAULT FALSE,
  driver_cert TEXT, /*{ type: String, enum: ['MICROBUS', 'VAN', null], default: null }*/
  trailer_cert INTEGER DEFAULT FALSE,
  requested_clubs TEXT DEFAULT '[]',
  requested_certs TEXT
) STRICT;

CREATE TABLE vehicles (
  id INTEGER primary key,
  _id TEXT,
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, /*{ enum: ['Van', 'Microbus', 'Truck', 'Enterprise', 'PersonalVehicle'] }*/
  active INTEGER DEFAULT TRUE
);

CREATE TABLE vehicle_requests (
  id INTEGER primary key,
  _id TEXT,
  number INTEGER UNIQUE,
  requester TEXT NOT NULL REFERENCES users ON DELETE RESTRICT ON UPDATE CASCADE,
  request_details TEXT, /* requestDetails */
  mileage INTEGER,
  num_participants INTEGER, /* noOfPeople */
  trip TEXT REFERENCES trips ON DELETE RESTRICT ON UPDATE CASCADE, /* associatedTrip */
  request_type TEXT, /* requestType { enum: ['TRIP', 'SOLO'] } */
  requested_vehicles TEXT, /* requestedVehicles */
  status TEXT DEFAULT 'pending', /*{ enum: ['pending', 'approved', 'denied'], }, */
  assignments TEXT
) STRICT;

CREATE TABLE club_leaders (
	user INTEGER REFERENCES users ON DELETE CASCADE ON UPDATE CASCADE,
	club INTEGER REFERENCES clubs ON DELETE RESTRICT ON UPDATE CASCADE
);

/* CREATE TABLE packets_stops ( */
/* 	packet TEXT REFERENCES packets ON DELETE CASCADE ON UPDATE CASCADE, */
/* 	stop TEXT REFERENCES stops(name) ON DELETE RESTRICT ON UPDATE CASCADE */
/* ); */

/* CREATE TRIGGER directions_inserted AFTER INSERT ON directions */
/* BEGIN */
/* 	UPDATE directions SET updated_at = unixepoch() WHERE id = NEW.id; */
/* END; */

/* CREATE TRIGGER directions_updated AFTER UPDATE ON directions */
/* BEGIN */
/* 	UPDATE directions SET updated_at = unixepoch() WHERE id = NEW.id; */
/* END; */

/* CREATE TRIGGER packets_inserted AFTER INSERT ON packets */
/* BEGIN */
/* 	UPDATE packets SET updated_at = unixepoch() WHERE name = NEW.name; */
/* END; */

/* CREATE TRIGGER packets_updated AFTER UPDATE ON packets */
/* BEGIN */
/* 	UPDATE packets SET updated_at = unixepoch() WHERE name = NEW.name; */
/* END; */