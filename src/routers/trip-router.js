import { Router } from 'express';
import { requireAuth } from '../services/passport';
import { logError } from '../services/error';
import controllers from '../controllers';
import models from '../models';

const tripsRouter = Router();

tripsRouter.route('/')
  .post(requireAuth, (req, res) => {
    controllers.trips.createTrip(req.user, req.body).then((result) => {
      res.json(result);
    }).catch((error) => { console.log(error); logError({ type: 'createTrip', message: error.message }); return res.status(500).json(error); });
  })
  .get(requireAuth, async (req, res) => {
    const filters = {};
    if (req.query.club) {
      const club = await models.clubs.findOne({ name: req.query.club });
      if (club) filters.club = club.id;
      else res.status(404).json(new Error('No club found with that name'));
    }
    controllers.trips.getTrips(filters).then((result) => {
      res.json(result);
    }).catch((error) => { return res.status(500).json(error); });
  });

tripsRouter.route('/:tripID')
  .get(requireAuth, async (req, res) => {
    controllers.trips.getTrip(req.params.tripID, req.user)
      .then((result) => { res.json(result); })
      .catch((error) => { return res.status(500).json(error); });
  })
  .put(requireAuth, controllers.trips.updateTrip)
  .delete(requireAuth, controllers.trips.deleteTrip);


/**
 * Trip membership functions
 */

tripsRouter.post('/apply/:tripID', requireAuth, (req, res) => {
  controllers.trips.addToPending(req.params.tripID, req.user._id, req.body.trippeeGear)
    .then(() => {
      controllers.trips.getTrip(req.params.tripID, req.user).then((result) => { return res.json(result); });
    })
    .catch((error) => { console.log(error); logError({ type: 'addToPending', message: error.message }); res.status(500).send(error.message); });
});

tripsRouter.post('/join/:tripID', requireAuth, (req, res) => {
  controllers.trips.join(req.params.tripID, req.body.joiningUserID).then(() => { res.json(); }).catch((error) => { res.status(500).json(error); });
});
tripsRouter.post('/reject/:tripID', requireAuth, (req, res) => {
  controllers.trips.reject(req.params.tripID, req.body.rejectedUserID).then(() => { return res.json(); }).catch((error) => { res.status(500).json(error); });
});

tripsRouter.post('/leave/:tripID', requireAuth, (req, res) => {
  controllers.trips.leave(req.params.tripID, req.body.leavingUserID).then(() => { res.json(); }).catch((error) => { return res.status(500).json(error); });
});

tripsRouter.put('/set-attendence/:tripID', requireAuth, controllers.trips.setMemberAttendance);
tripsRouter.put('/toggle-left/:tripID', requireAuth, controllers.trips.toggleTripLeftStatus);
tripsRouter.put('/toggle-returned/:tripID', requireAuth, controllers.trips.toggleTripReturnedStatus);
tripsRouter.put('/toggle-leadership/:tripID', requireAuth, controllers.trips.toggleTripLeadership);

tripsRouter.put('/editusergear/:tripID', requireAuth, controllers.trips.editUserGear);

export default tripsRouter;