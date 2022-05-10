import pg from 'pg';
import { spawn } from 'child_process';
const Client = pg.Client;

import dotenv from 'dotenv'
import Discord from 'discord.js';

const dclient = new Discord.Client({intents: ["GUILDS", "GUILD_MESSAGES"]});

let logged_in = false;

dclient.login("OTczNDY2Mzk4Nzc0OTM1NTcy.Gk0nOa.rt6DKpsB4izcHwZkWYhbGXADn8gpXoEMlAlVow");

dclient.on('ready', () => {
    if (dclient.user == null) {
        throw new Error('Could not login to Discord.');
    }

    logged_in = true;
    console.log({ msg: `Logged in as ${dclient.user.tag}` });


    try {
        dclient.channels
            .fetch('973475136860733460')
            .then((channel) => channel.send( "THIS IS A TEST"));
    } catch (e) {
        console.log({
            msg: 'Aborting, error sending a msg to Telegram',
            error: e.message ?? '',
        });
        return handleExit();
    }
});

dotenv.config()

const pg_client = new Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: 5432,
});

pg_client.connect();

let currentDate = new Date();
let cDay = currentDate.getDate();
let cMonth = currentDate.getMonth() + 1;
let cYear = currentDate.getFullYear();
let time = currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();
console.log("****************************");
console.log(cDay + "/" + cMonth + "/" + cYear, time);
console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>");


async function send_message(message) {
    if (logged_in) {
        try {
            dclient.channels
                .fetch('973475136860733460')
                .then((channel) => channel.send(message));
        } catch (e) {
            console.log({
                msg: 'Aborting, error sending a msg to Telegram',
                error: e.message ?? '',
            });
            return handleExit();
        }
    }
}

async function insert_last_block(block_id) {
    let result = 0;
    const query = `
    insert into "last_notifications" (id)
    VALUES (${block_id})
    `;

    try {
        const res = await pg_client.query(query);

        if(res.rowCount > 0) {
            result = res.rows[0].block;
        }
    } catch (err) {
        console.log(err.stack);
    }

    return result;
}

async function get_last_block() {
    let result = 0;
    const query = `
    SELECT id as block FROM "last_notifications" order by id desc
    LIMIT 1
    `;

    try {
        const res = await pg_client.query(query);

        if(res.rowCount > 0) {
            result = res.rows[0].block;
        }
    } catch (err) {
        console.log(err.stack);
    }

    return result;
}

async function get_transactions(block_height) {
    let result = null;
    const query = `
    select * from account_tx 
    inner join tx on account_tx.tx_id = tx.id 
    inner join block on tx.block_id = block.id
    where account_tx.account = 'terra1e25zllgag7j9xsun3me4stnye2pcg66234je3u'
    and data::text like '%liquidate%'
    and block.height > ${block_height} ;
    `;

    try {
        const res = await pg_client.query(query);

        if(res.rowCount > 0) {
            result = res.rows;
        }
    } catch (err) {
        console.log(err.stack);
    }

    return result;
}

async function make_notifications(transaction) {
    send_message(`https://finder.terra.money/mainnet/tx/${transaction.hash}`);
    //console.log(`https://finder.terra.money/mainnet/tx/${transaction.hash}`)
    //console.log(transaction);
}

async function main() {
    try {
        let block = await get_last_block();
        let transactions = await get_transactions(block);
        let max_block_height = 0;

        for await (let transaction of transactions) {
            await make_notifications(transaction);
            if (transaction.height > max_block_height) { max_block_height = transaction.height }
        }

        //await insert_last_block(max_block_height);
    } catch (err) {
         console.log(err.stack);
    }

    return null;
}

await main();

//process.exit(1);
