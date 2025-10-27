export const handler = async (event) => {
  try {
    const { renderedScenes } = JSON.parse(event.body);
    const combinedVideoUrl = renderedScenes.join("+"); // placeholder logic
    return {
      statusCode: 200,
      body: JSON.stringify({ combinedVideoUrl })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
