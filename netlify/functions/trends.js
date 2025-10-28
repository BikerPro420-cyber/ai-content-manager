exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const source = (qs.source || "global").toLowerCase();

  // Stub seguro (luego se puede reemplazar por APIs reales)
  const samples = {
    global:  ["Hurricane season update","AI video models","Euro inflation","Halloween stories","Indie horror games","Solar storms","Cybersecurity month","Classic urban legends","True crime docs","Ghost towns USA"],
    youtube: ["Unsolved case 2025","Backrooms explained","Analog horror tier list","AI narration tips","Horror SFX pack","Top 10 haunted places","ARGs comeback","Cinematic LUTs","Halloween shorts","Creepy pasta remakes"],
    twitter: ["#HorrorTok","#AnalogHorror","#Halloween2025","#TrueCrime","#Filmmaker","#AfterEffects","#VoiceOver","#SoundDesign","#Screenwriting","#YouTubeAdvice"]
  };
  const topics = samples[source] || samples.global;

  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"},
    body: JSON.stringify({ source, topics })
  };
};