const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');
const SavingsPlan = require('../models/SavingsPlan');
const Lock = require('../models/Lock');

/**
 * Calculates the next contribution date based on frequency
 * @param {Date} currentDate 
 * @param {string} frequency 
 * @returns {Date}
 */
const calculateNextDate = (currentDate, frequency) => {
    const next = new Date(currentDate);
    if (frequency === 'daily') next.setDate(next.getDate() + 1);
    else if (frequency === 'weekly') next.setDate(next.getDate() + 7);
    else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
    return next;
};

const processSavings = async () => {
    console.log('[Automation] Starting Savings Plan processing...');
    const now = new Date();
    const activePlans = await SavingsPlan.find({
        status: 'active',
        nextContributionDate: { $lte: now },
        frequency: { $ne: 'manual' }
    });

    for (const plan of activePlans) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const user = await User.findById(plan.user).session(session);
            if (!user) throw new Error('User not found');

            const balanceField = plan.currency === 'NGN' ? 'nairaBalance' : 'dollarBalance';

            if (user[balanceField] < plan.amountPerFrequency) {
                console.log(`[Automation] Insufficient funds for plan: ${plan.title} (User: ${user.username})`);
                plan.status = 'paused'; // Auto-pause instead of failing completely to let user resume
                await plan.save({ session });
                await session.commitTransaction();
                continue;
            }

            // Deduct from user balance
            user[balanceField] -= plan.amountPerFrequency;
            await user.save({ session });

            // Create transaction record
            const transaction = new Transaction({
                user: plan.user,
                amount: plan.amountPerFrequency,
                currency: plan.currency,
                description: `Automated contribution to savings: ${plan.title}`,
                type: 'expense',
                date: now
            });
            await transaction.save({ session });

            // Update plan
            plan.currentAmount += plan.amountPerFrequency;
            if (plan.currentAmount >= plan.targetAmount) {
                plan.status = 'completed';
            } else {
                plan.nextContributionDate = calculateNextDate(plan.nextContributionDate, plan.frequency);
            }
            await plan.save({ session });

            await session.commitTransaction();
            console.log(`[Automation] Successfully processed savings for: ${plan.title}`);
        } catch (error) {
            await session.abortTransaction();
            console.error(`[Automation] Error processing savings plan ${plan._id}:`, error.message);
        } finally {
            session.endSession();
        }
    }
};

const processBills = async () => {
    console.log('[Automation] Starting Bill processing...');
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);

    const pendingBills = await Bill.find({
        status: 'pending',
        dueDate: { $lte: tomorrow },
        autoPay: true
    });

    for (const bill of pendingBills) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const user = await User.findById(bill.user).session(session);
            if (!user) throw new Error('User not found');

            const balanceField = bill.currency === 'NGN' ? 'nairaBalance' : 'dollarBalance';

            if (user[balanceField] < bill.amount) {
                console.log(`[Automation] Insufficient funds for bill: ${bill.title} (User: ${user.username})`);
                bill.status = 'failed';
                await bill.save({ session });
                await session.commitTransaction();
                continue;
            }

            // Deduct balance
            user[balanceField] -= bill.amount;
            await user.save({ session });

            // Create transaction record
            const transaction = new Transaction({
                user: bill.user,
                amount: bill.amount,
                currency: bill.currency,
                description: `Automated payment for bill: ${bill.title}`,
                type: 'expense',
                date: new Date()
            });
            await transaction.save({ session });

            // Update bill
            bill.status = 'paid';
            bill.paidAt = new Date();
            await bill.save({ session });

            await session.commitTransaction();
            console.log(`[Automation] Successfully paid bill: ${bill.title}`);
        } catch (error) {
            await session.abortTransaction();
            console.error(`[Automation] Error processing bill ${bill._id}:`, error.message);
        } finally {
            session.endSession();
        }
    }
};

const processLocks = async () => {
    console.log('[Automation] Starting Lock processing...');
    const now = new Date();
    const result = await Lock.updateMany(
        { status: 'active', dueDate: { $lte: now } },
        { $set: { status: 'available' } }
    );
    if (result.modifiedCount > 0) {
        console.log(`[Automation] Released ${result.modifiedCount} locks`);
    }
};

const runAutomation = async () => {
    console.log(`[Automation] Runner started at ${new Date().toISOString()}`);
    try {
        await processSavings();
        await processBills();
        await processLocks();
        console.log('[Automation] Runner finished successfully');
    } catch (error) {
        console.error('[Automation] Critical error in runner:', error);
    }
};

module.exports = { runAutomation };
