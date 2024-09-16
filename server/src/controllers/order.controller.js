const { Order, Gig, User } = require('../models');
const { CustomException } = require('../utils');
const stripe = require('stripe')(process.env.STRIPE_SECRET);

const getOrders = async (request, response) => {
    try {
        const orders = await Order.find({ $and: [{ $or: [{ sellerID: request.userID }, { buyerID: request.userID }] }, { isCompleted: true }] }).populate(request.isSeller ? 'buyerID' : 'sellerID', 'username email image country');
        return response.send(orders);
    }
    catch ({ message, status = 500 }) {
        return response.send({
            error: true,
            message
        })
    }
}

const paymentIntent = async (request, response) => {
    const { _id } = request.params;

    try {
        const gig = await Gig.findOne({ _id });
        const customerInformation = await User.findById({ _id: request.userID })

    
        if (!customerInformation) {
            return response.send({
                error: true,
                message: "Buyer information not found."
            })
        }

        if (customerInformation?.isSeller === true) {
            return response.send({
                error: true,
                message: "Your are a seller, Seller Can't Order with gigs."
            })
        }

        const payment_intent = await stripe.paymentIntents.create({
            amount: gig.price * 100,
            currency: "inr",
            description: gig.shortDesc,
            automatic_payment_methods: {
                enabled: true,
            },
            shipping: {
                name: customerInformation?.username,          // Pass the customer's name
                address: {
                    line1: 'Address Line 1',   // Address fields
                    city: 'City',
                    postal_code: 'IN',
                    country: "IN",             // Country code (India in this case)
                },
            },
        });

        const order = new Order({
            gigID: gig._id,
            image: gig.cover,
            title: gig.title,
            buyerID: request.userID,
            sellerID: gig.userID,
            price: gig.price,
            payment_intent: payment_intent.id
        });

        await order.save();
        return response.send({
            error: false,
            clientSecret: payment_intent.client_secret
        })

    }
    catch ({ message, status = 500 }) {
        return response.send({
            error: true,
            message
        })
    }
}

const updatePaymentStatus = async (request, response) => {
    const { payment_intent } = request.body;

    try {
        const order = await Order.findOneAndUpdate({ payment_intent }, {
            $set: {
                isCompleted: true
            }
        }, { new: true });

        if (order?.isCompleted) {
            return response.status(202).send({
                error: false,
                message: 'Order has been confirmed!'
            })
        }

        throw CustomException('Payment status not updated!', 500);
    }
    catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        })
    }
}

module.exports = {
    getOrders,
    paymentIntent,
    updatePaymentStatus
}