const getRecordingDetails = (jsonData, searchText) => {
    const ar = JSON.parse(jsonData);
    const mimeTypeOfVideo = ar.filter((item) => item.mimeType == 'video/mp4');
    const filteredArray = mimeTypeOfVideo.filter((item) => item.name.includes(`${searchText}`));
    console.log(filteredArray);
    return filteredArray;
};
module.exports = getRecordingDetails;
