export const handler = async (event) => {
  try {
    const { videoUrl, voiceTrackUrl, backgroundSoundUrl } = JSON.parse(event.body);
    const finalUrl = `${videoUrl}?voice=${voiceTrackUrl}&bg=${backgroundSoundUrl}`;
    return {
      statusCode: 200,
      body: JSON.stringify({ finalUrl })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
