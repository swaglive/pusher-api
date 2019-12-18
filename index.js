const Pusher = require('pusher-js');
const PusherSDK = require('pusher');
const { send } = require('micro');
const url = require('url');
const bunyan = require('bunyan');


const logger = bunyan.createLogger({
  name: 'pusher-channels-api',
  level: process.env.NODE_ENV == 'debug' ? 'debug': 'info',
});
const pusher = new PusherSDK({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY,
  secret: process.env.PUSHER_APP_SECRET,
  cluster: process.env.PUSHER_APP_CLUSTER,
  useTLS: true,
});
const client = new Pusher(process.env.PUSHER_APP_KEY, {
  cluster: process.env.PUSHER_APP_CLUSTER,
  forceTLS: true,
  disableStats: true,
  // enabledTransports: ['wss'],
  authorizer: (channel, options) => {
    return { authorize: (socketId, next) => {
      logger.debug({ socketId, channel: channel.name }, 'Authorizing channel');

      return next(null, pusher.authenticate(socketId, channel.name, {
        user_id: 'SYSTEM',
    	}));
    }};
  },
});
client.connection.bind('state_change', ( states ) => logger.info(states));
client.connection.bind('error', ( err ) => logger.error(err));


module.exports = async (req, res) => {
  let { pathname } = url.parse(req.url);

  if (!pathname.startsWith('/presence-')) return {};
  let channelName = pathname.substring(1);

  let channel = client.subscribe(channelName)
    .bind('pusher:subscription_succeeded', ({ me, members }) => {
      delete members[me.id];
      logger.debug(members, 'Active members');
      send(res, 200, members);
      client.unsubscribe(channelName);
    });
}
