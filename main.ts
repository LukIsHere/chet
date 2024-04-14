import {createBot,startBot,Intents,createChannel,sendMessage,editChannel,deleteChannel} from "https://deno.land/x/discordeno@18.0.1/mod.ts";

const cer =Deno.readTextFileSync(
  "/etc/letsencrypt/live/srv.lukishere.dev/fullchain.pem",
)

const key = Deno.readTextFileSync(
  "/etc/letsencrypt/live/srv.lukishere.dev/privkey.pem",
)

const token = Deno.readTextFileSync("token.txt")


const bot = createBot({
  token: token,
  intents:Intents.GuildMessages|Intents.MessageContent|Intents.Guilds
})

bot.events.ready = ()=>{
  console.log("bot online")
}

Deno.serve({ //fix sudo setcap 'cap_net_bind_service=+ep' /path/to/deno
  port: 8888,
  cert: cer,
  key: key
}, entry);

Deno.serve({
  port: 8080,
}, entry);

const users:{[key:string]:(msg:string)=>void} = {}

bot.events.messageCreate = (_bot,msg) =>{
  if(msg.authorId==bot.id)
    return
  if(users[msg.channelId.toString()])
    users[msg.channelId.toString()](msg.content)
}

async function entry(req: Request): Promise<Response> {
  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 501 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  const id = Math.round(Math.random()*9999999);

  socket.addEventListener("open", () => {
    console.log(id+" client connected!");
    
  });
  createChannel(bot,"1114218708282384464",{name:"klient #"+id.toString(),parentId:"1229065690573439006"}).then(c=>{
    console.log("utworzono kanal")
    let mt = 0;
    users[c.id.toString()] = (txt)=>{
      txt = txt.replaceAll("http","")
      txt = txt.replaceAll("@","")
      txt = txt.replaceAll(";","")
      txt = txt.replaceAll(">","")
      txt = txt.replaceAll("<","")
      socket.send(txt)
      mt++;
    }
    
    socket.addEventListener("message", (event) => {
      let txt:string = event.data.toString()
      txt = txt.replaceAll("http","")
      txt = txt.replaceAll("@","")
      txt = txt.replaceAll(";","")
      txt = txt.replaceAll(">","")
      txt = txt.replaceAll("<","")
      sendMessage(bot,c.id,{content:txt});
    });
    socket.addEventListener("close", () => {
      if(mt){
        sendMessage(bot,c.id,{content:"utracono połączenie z klientem"})
        editChannel(bot,c.id,{parentId:"1133788583078146182"})
      }else 
        deleteChannel(bot,c.id)
      delete users[c.id.toString()]
      console.log(id+" client disconnected")
    })
  })

  return response;
}

await startBot(bot)
