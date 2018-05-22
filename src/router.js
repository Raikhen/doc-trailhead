import { Router } from 'express';
import * as Trips from './controllers/trip_controller';
import * as Users from './controllers/user_controller';
import { requireAuth, requireSignin } from './services/passport';


const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'welcome to our doc app!' });
});

router.post('/signin', requireSignin, Users.signin);
router.post('/signup', Users.signup);

router.route('/trips')
  .post(requireAuth, Trips.createTrip)
  .get(Trips.getTrips);

router.get('/trips/:club', Trips.getTripsByClub);

router.route('/trip/:id')
  .get(Trips.getTrip)
  .put(requireAuth, Trips.updateTrip)
  .delete(requireAuth, Trips.deleteTrip);

router.put('/jointrip', requireAuth, Users.joinTrip);
router.put('/updateUser', requireAuth, Users.updateUser);

router.get('/myTrips', requireAuth, Users.myTrips);
router.get('/isOnTrip/:id', requireAuth, Users.isOnTrip);
router.delete('/leaveTrip', requireAuth, Users.leaveTrip);
export default router;
