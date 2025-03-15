import axios, { AxiosResponse } from "axios";

interface getAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export const getAccessToken = async (): Promise<string | undefined> => {
  const clientID = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const paypalAcessTokenUrl = process.env.PAYPAL_URL + "/v1/oauth2/token";

  const auth = Buffer.from(`${clientID}:${clientSecret}`).toString("base64");

  try {
    const response: AxiosResponse<getAccessTokenResponse> = await axios.post(
      paypalAcessTokenUrl,
      "grant_type=client_credentials",
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${auth}`,
        },
      }
    );

    return response.data.access_token;
  } catch (error) {
    throw error;
  }
};

interface createPaymentResponse {
  id: string;
  links: { href: string; rel: string; method: string }[];
}

export const createPayment = async (
  amount: number
): Promise<createPaymentResponse> => {
  const data = {
    intent: "sale",
    payer: {
      payment_method: "paypal",
    },
    transactions: [
      {
        amount: {
          total: amount,
          currency: "USD",
        },
        description: "buy package",
      },
    ],
    redirect_urls: {
      return_url: "http://localhost:3030/api/v1/wallet/success",
      cancel_url: "http://localhost:3030/api/v1/wallet/cancel",
    },
  };

  try {
    const accessToken = await getAccessToken();
    const paypalPaymentUrl = process.env.PAYPAL_URL + "/v1/payments/payment";
    const response: AxiosResponse<createPaymentResponse> = await axios.post(
      paypalPaymentUrl,
      data,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

interface PayPalLink {
  href: string;
  rel: string;
  method: string;
}

interface PayPalAmountDetails {
  subtotal: string;
  shipping: string;
  insurance: string;
  handling_fee: string;
  shipping_discount: string;
  discount: string;
}

interface PayPalAmount {
  total: string;
  currency: string;
  details: PayPalAmountDetails;
}

interface PayPalShippingAddress {
  recipient_name: string;
  line1: string;
  city: string;
  state: string;
  postal_code: string;
  country_code: string;
}

interface PayPalPayerInfo {
  email: string;
  first_name: string;
  last_name: string;
  payer_id: string;
  shipping_address: PayPalShippingAddress;
  country_code: string;
}

interface PayPalPayer {
  payment_method: string;
  status: string;
  payer_info: PayPalPayerInfo;
}

interface PayPalTransactionFee {
  value: string;
  currency: string;
}

interface PayPalSale {
  id: string;
  state: string;
  amount: PayPalAmount;
  payment_mode: string;
  protection_eligibility: string;
  protection_eligibility_type: string;
  transaction_fee: PayPalTransactionFee;
  parent_payment: string;
  create_time: string;
  update_time: string;
  links: PayPalLink[];
}

interface PayPalRelatedResource {
  sale: PayPalSale;
  transaction_fee: { value: number };
}

interface PayPalPayee {
  merchant_id: string;
  email: string;
}

interface PayPalItemList {
  shipping_address: PayPalShippingAddress;
}

interface PayPalTransaction {
  amount: PayPalAmount;
  payee: PayPalPayee;
  description: string;
  item_list: PayPalItemList;
  related_resources: PayPalRelatedResource[];
}

interface PayPalPaymentResponse {
  id: string;
  intent: string;
  state: string;
  cart: string;
  payer: PayPalPayer;
  transactions: PayPalTransaction[];
  failed_transactions: any[];
  create_time: string;
  update_time: string;
  links: PayPalLink[];
}

export const executePayment = async (
  paymentId: string,
  payerId: string
): Promise<PayPalPaymentResponse> => {
  const data = {
    payer_id: payerId,
  };

  try {
    const accessToken = await getAccessToken();
    const response: AxiosResponse<PayPalPaymentResponse> = await axios.post(
      `https://api.sandbox.paypal.com/v1/payments/payment/${paymentId}/execute`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

interface PayPalPayoutAmount {
  value: Number;
  currency: string;
}

interface PayPalPayoutItem {
  recipient_type: string;
  amount: PayPalPayoutAmount;
  receiver: String;
  note: string;
  sender_item_id: string;
}

interface PayPalSenderBatchHeader {
  sender_batch_id: string;
  email_subject: string;
  email_message: string;
}

interface PayPalPayoutRequest {
  sender_batch_header: PayPalSenderBatchHeader;
  items: PayPalPayoutItem[];
}

interface PayPalPayoutResponse {
  batch_header: {
    payout_batch_id: string;
    batch_status: string;
  };
  links: PayPalLink[];
}

export const sendPayout = async (
  transactionId: string,
  amount: number,
  email: String
): Promise<String> => {
  const data: PayPalPayoutRequest = {
    sender_batch_header: {
      sender_batch_id: transactionId,
      email_subject: "You have a payout!",
      email_message:
        "You have received a payout! Thanks for using our service!",
    },
    items: [
      {
        recipient_type: "EMAIL",
        amount: {
          value: amount,
          currency: "USD",
        },
        receiver: email,
        note: "Thank you for your service!",
        sender_item_id: "item-1",
      },
    ],
  };

  try {
    const accessToken = await getAccessToken();
    const response: AxiosResponse<PayPalPayoutResponse> = await axios.post(
      "https://api.sandbox.paypal.com/v1/payments/payouts",
      data,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data.links[0].href;
  } catch (error) {
    throw error;
  }
};

export const getPayoutDetails = async (url: string): Promise<string> => {
  try {
    const accessToken = await getAccessToken();
    const response: AxiosResponse<PayPalPayoutResponse> = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data.batch_header.batch_status;
  } catch (error) {
    throw error;
  }
};
