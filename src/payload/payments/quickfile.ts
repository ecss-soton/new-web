import { v4 as uuidv4 } from 'uuid';
import md5 from 'md5';
import { Invoice } from './types';

const BASE_API = 'https://api.quickfile.co.uk/1_2';
let API_KEYS: string[];
let API_INDEX = 0;

function getAPIHeader(): { [key: string]: any } {
  if (!API_KEYS) {
    API_KEYS = process.env.QUICK_APPLICATION_IDS.split(',')
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  }

  const applicationID = API_KEYS[API_INDEX];
  API_INDEX = (API_INDEX + 1) % API_KEYS.length;

  const accountNumber = process.env.QUICK_ACCOUNT_NUMBER;
  const apiKey = process.env.QUICK_ACCOUNT_API_KEY;
  const subNumber = uuidv4();
  const md5Hash = md5(`${accountNumber}${apiKey}${subNumber}`);

  return {
    MessageType: 'Request',
    SubmissionNumber: subNumber,
    Authentication: {
      AccNumber: accountNumber,
      ApplicationID: applicationID,
      MD5Value: md5Hash,
    },
  };
}

async function postJSON(url: string, data: any): Promise<any> {
  const response = await fetch(`${BASE_API}/${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ payload: data }),
  });

  return response.json();
}

export async function createClient(username: string): Promise<number> {
  const password = uuidv4().replaceAll('-', '').substring(0, 15);
  const payload = {
    Header: getAPIHeader(),
    Body: {
      ClientDetails: { CompanyName: username },
      ClientContacts: {
        DefaultContact: {
          FirstName: username,
          Surname: username,
          Email: `${username}@soton.ac.uk`,
          TelephoneNumbers: {},
          Password: password,
        },
      },
    },
  };

  const res = await postJSON('Client/Create', payload);

  return res.Client_Create.Body.ClientID;
}

export async function getPaidInvoices(): Promise<number[]> {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const payload = {
    Header: getAPIHeader(),
    Body: {
      SearchParameters: {
        ReturnCount: 200,
        Offset: 0,
        OrderResultsBy: 'IssueDate',
        OrderDirection: 'DESC',
        InvoiceType: 'INVOICE',
        Status: 'PAIDFULL',
        IssueDateFrom: twoDaysAgo.toLocaleDateString('en-ca'), // yyyy-mm-dd
      },
    },
  };

  const res = await postJSON('Invoice/Search', payload);

  return res.Invoice_Search.Body.Record.map((record) => record.InvoiceID);
}

export async function deleteInvoices(invoiceIDs: number[]) {
  const payload = {
    Header: getAPIHeader(),
    Body: { InvoiceDetails: { InvoiceIDs: { InvoiceID: invoiceIDs } } },
  };

  await postJSON('Invoice/Delete', payload);
}

export async function sendInvoices(invoiceIDs: number[]) {
  const payload = {
    Header: getAPIHeader(),
    Body: {
      SendItem: invoiceIDs.map((id) => ({
        InvoiceID: id,
        SendByEmail: false,
        SendBySnailMail: false,
      })),
    },
  };

  await postJSON('Invoice/Send', payload);
}

export async function getInvoice(invoiceID: number): Promise<{status: string, previewURI: string}> {
  const payload = {
    Header: getAPIHeader(),
    Body: {
      InvoiceID: invoiceID,
    },
  };

  const res = (await postJSON('Invoice/Get', payload)).Invoice_Get.Body.InvoiceDetails;

  return ({ status: res.Status, previewURI: res.DirectPreviewUri });
}

export async function createInvoice(invoice: Invoice): Promise<number> {
  const items = invoice.items.map((i) => {
    const pounds = Math.floor((Math.abs(i.cost) / 100)) * (i.cost > 0 ? 1 : -1);
    const pence = (Math.abs(i.cost) % 100).toString().padStart(2, '0');
    return {
      ItemID: 0,
      ItemName: i.name,
      ItemDescription: i.description,
      UnitCost: `${pounds}.${pence}`,
      Qty: 1,
    };
  });

  const payload = {
    Header: getAPIHeader(),
    Body: {
      InvoiceData: {
        InvoiceType: 'INVOICE',
        ClientID: invoice.clientID,
        Currency: 'GBP',
        TermDays: 2,
        Language: 'en',
        InvoiceDescription: invoice.name,
        InvoiceLines: { ItemLines: { ItemLine: items } },
        Scheduling: {
          SingleInvoiceData: {
            IssueDate: new Date().toLocaleDateString('en-ca'), // yyyy-mm-dd
          },
        },
      },
    },
  };

  const res = await postJSON('Invoice/Create', payload);

  return res.Invoice_Create.Body.InvoiceID;
}
