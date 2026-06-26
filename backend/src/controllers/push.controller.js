const {
  deletePushSubscription,
  getVapidConfig,
  savePushSubscription,
} = require('../services/push.service')

function getPushConfig(_request, response) {
  const config = getVapidConfig()

  response.json({
    enabled: Boolean(config),
    publicKey: config?.publicKey || '',
  })
}

function validateSubscription(subscription) {
  return Boolean(
    subscription &&
      typeof subscription.endpoint === 'string' &&
      subscription.keys &&
      typeof subscription.keys.p256dh === 'string' &&
      typeof subscription.keys.auth === 'string',
  )
}

async function registerPushSubscription(request, response, next) {
  try {
    const subscription = request.body?.subscription

    if (!validateSubscription(subscription)) {
      return response.status(422).json({
        message: 'Subscription thông báo không hợp lệ!',
      })
    }

    await savePushSubscription(request.user.id, subscription, request.get('user-agent') || '')

    response.status(204).send()
  } catch (error) {
    next(error)
  }
}

async function unregisterPushSubscription(request, response, next) {
  try {
    const endpoint = request.body?.endpoint

    if (typeof endpoint !== 'string' || !endpoint) {
      return response.status(422).json({
        message: 'Endpoint thông báo không hợp lệ!',
      })
    }

    await deletePushSubscription(request.user.id, endpoint)

    response.status(204).send()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getPushConfig,
  registerPushSubscription,
  unregisterPushSubscription,
}
