import dotenv from 'dotenv';
dotenv.config();

import {RefreshableAuthProvider, StaticAuthProvider} from 'twitch-auth';
import {ChatClient} from 'twitch-chat-client';

import {LIST_COMMANDS} from './commands.js';

import {promises as fs} from 'fs';
import got from 'got';

const getRating = async username => {
  try {
    const response = await got(`https://lichess.org/api/user/${username}`);
    const data = JSON.parse(response.body);
    const rankBullet = data.perfs.bullet.rating;
    const rankBlitz = data.perfs.blitz.rating;
    const rankRapid = data.perfs.rapid.rating;
    return `Classement de ${username} ♟ bullet : ${rankBullet} ♟ blitz : ${rankBlitz} ♟ rapide : ${rankRapid}`;
  } catch (err) {
    console.log(err);
  }
  return `Désolé, c'est un échec`;
};

async function main() {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const tokenData = JSON.parse(await fs.readFile('./tokens.json', 'UTF-8'));
  const authProvider = new RefreshableAuthProvider(
    new StaticAuthProvider(clientId, tokenData.accessToken),
    {
      clientSecret,
      refreshToken: tokenData.refreshToken,
      expiry:
        tokenData.expiryTimestamp === null
          ? null
          : new Date(tokenData.expiryTimestamp),
      onRefresh: async ({accessToken, refreshToken, expiryDate}) => {
        const newTokenData = {
          accessToken,
          refreshToken,
          expiryTimestamp: expiryDate === null ? null : expiryDate.getTime(),
        };
        await fs.writeFile(
          './tokens.json',
          JSON.stringify(newTokenData, null, 4),
          'UTF-8'
        );
      },
    }
  );

  const chatClient = new ChatClient(authProvider, {channels: ['detnop']});

  chatClient.onSub((channel, user) => {
    chatClient.say(
      channel,
      `🎉 NOUVEAU SUB DE @${user} ! Un nouveau viking ! ⚔️ Merci ⚔️`
    );
  });

  chatClient.onResub((channel, user, subInfo) => {
    chatClient.say(
      channel,
      `🎉 RESUB DE @${user} ! Un viking depuis déjà ${subInfo.months} mois ! ⚔️ Merci ⚔️`
    );
  });

  chatClient.onSubGift((channel, user, subInfo) => {
    chatClient.say(
      channel,
      `🎁 SUB GIFT DE @${subInfo.gifter} ! Merci d'avoir fait de @${user} un viking !`
    );
  });

  chatClient.onCommunitySub((channel, user) => {
    chatClient.say(
      channel,
      `🎁 RANDOM SUB GIFT DE @${user} ! Merci d'avoir transformé un serf en viking !`
    );
  });

  chatClient.onRaid((channel, user, raidInfo) => {
    chatClient.say(
      channel,
      `⚡️ UN RAID DE @${user} ! ⚔️ Merci pour les ${raidInfo.viewerCount} viewers ⚔️`
    );
  });

  chatClient.onHosted((channel, byChannel, auto, viewers) => {
    if (auto) return;
    chatClient.say(
      channel,
      `⚡️ UN HOST DE ${byChannel} ! ⚔️ Merci pour les ${viewers} viewers ⚔️`
    );
  });

  chatClient.onMessage(async (channel, user, message) => {
    if (!message.startsWith('!')) return;

    const commandArgs = message.slice(1).split(' ');
    const command = commandArgs.shift().toLowerCase();

    if (command == 'elo') {
      const result = await getRating(commandArgs[0]);
      chatClient.say(channel, result);
    } else {
      chatClient.say(
        channel,
        LIST_COMMANDS[command] ?? "Désolé, cette commande n'existe pas encore…"
      );
    }
  });

  console.log('Connecting…');
  await chatClient.connect().catch(console.error);
  console.log('Connected !');
}

main();
