import { User } from "../models/user.model";
import { Wallet } from "../models/wallet.model";

(async function () {
  const user = await User.findById(process.env.SYSTEM_USER_ID);
  if (!user) {
    const newUser = new User({
      _id: process.env.SYSTEM_USER_ID,
      name: "system",
      email: "system@bot.com",
      password: "system",
      type: "System",
    });
    const newWallet = await Wallet.create({
      userId: newUser._id,
      balance: 10000,
      currency: "USD",
      availableBalance: 10000,
    });
    newUser.wallet = newWallet._id;
    await newUser.save();
  }
})();
