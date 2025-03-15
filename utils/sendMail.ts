import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
require("dotenv").config();

interface IEmailOptions {
  email: string;
  subject: string;
  template: string;
  data: { [key: string]: string };
}

const sendMail = async (options: IEmailOptions): Promise<void> => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    service: process.env.SMTP_SERVICE,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const message = {
    from: `${process.env.SMTP_EMAIL} <${process.env.SMTP_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: await ejs.renderFile(
      path.join(__dirname, `../mails/${options.template}`),
      options.data
    ),
  };

  await transporter.sendMail(message);
};

export default sendMail;
