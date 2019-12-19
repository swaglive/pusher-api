const PusherClient = require('pusher-js');
const PusherServer = require('pusher');
const { send, json } = require('micro');
const bunyan = require('bunyan');


const config = {
  PUSHER_USER_ID: process.env.PUSHER_USER_ID || 'SYSTEM',
  PUSHER: {
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_APP_KEY,
    secret: process.env.PUSHER_APP_SECRET,
    cluster: process.env.PUSHER_APP_CLUSTER,
  },
  LOGGER: {
    name: process.env.LOGGER_NAME || 'pusher-channels-api',
    level: ['debug'].includes(process.env.NODE_ENV) ? 'debug': 'info',
  },
};

const logger = bunyan.createLogger(config.LOGGER);
const pusher = new PusherServer({
  ...config.PUSHER,
  useTLS: true,
});
const client = new PusherClient(config.PUSHER.key, {
  cluster: config.PUSHER.cluster,
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
  let { channel } = await json(req);

  // Non-presence channels does not support member data
  if (!channel.startsWith('presence-')) return {};

  client.subscribe(channel)
    .bind('pusher:subscription_succeeded', ({ me, members }) => {
      delete members[me.id];
      logger.debug(members, 'Active members');
      send(res, 200, members);
      client.unsubscribe(channel);
    });
}
