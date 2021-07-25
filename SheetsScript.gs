// Title: Dirt Camp Auto
// Author: Cole Goodnight
// 
// Dirt camp auto is a script for google sheets that builds camper groups 
// for Evergreen Mountain Bike Alliance's dirt camp. When applied to a standard
// roster provided from a Google Forms survey, campers are sorted into groups
// based on their survey responses. Coaches are then paired with groups and 
// the groups are written to a new sheet for readability. This script saves 
// roughly 20 hours of manual computation over a 10 week summer camp season
// and removes subjectivity from the group building process. 

// creates new sheet with campers and coaches for the week
function buildGroups() {
  // get data from spreadsheet
  let sheet = SpreadsheetApp.getActiveSheet();
  let data = sheet.getDataRange().getValues();

  let campers = [];
  let coaches = getCoaches();

  // iterate through rows while there is still a name value
  let i = 2;
  while (i < data.length) {
    // check if there is a name value
    if (data[i][0] !== null) {
      // score camper and add to list
      campers.push(rankCamper(data[i]));
    }
    i++;
  }

  // sort campers by rank
  campers.sort((a,b) => b.rank - a.rank);
  
  // fill out coaches lists to prevent undefined behavior
  while (coaches.assistants.length < 4) {
    coaches.assistants.push("");
  }

  while (coaches.heads.length < 4) {
    coaches.heads.push("");
  }

  while (coaches.mentors.length < 4) {
    coaches.mentors.push("");
  }

  // create 4 groups of campers
  let numCampers = campers.length;
  let groups = [];
  let groupNum = 4;
  let maxGroupSize = Math.ceil(numCampers/groupNum);

  while (groupNum > 0) {

    let curGroupSize = Math.trunc(numCampers/groupNum);
    numCampers-=curGroupSize;
    let curCampers = [];

    for(let i = 0; i < curGroupSize; i++) {
      curCampers.push(campers.shift());
    }

    while (curCampers.length < maxGroupSize) {
      curCampers.push({name:"", rank:0});
    }
    groups.push(
        {
          head:coaches.heads.shift(), 
          assistant:coaches.assistants.shift(), 
          mentor:coaches.mentors.shift(),
          campers:curCampers
        })
    groupNum--;
  }


  // create new sheet in workbook and write groups
  let curSheet = SpreadsheetApp.getActiveSpreadsheet();
  curSheet.insertSheet("groups");

  let values = [["", "", "", "", ""]];

  let row2 = [""];
  let row3 = [""];
  let row4 = [""];

  for (let i = 0; i < 4; i++) {
    row2.push(groups[i].head);
  }
  values.push(row2);

  for (let i = 0; i < 4; i++) {
    row3.push(groups[i].assistant);
  }
  values.push(row3);

  for (let i = 0; i < 4; i++) {
    row4.push(groups[i].mentor);
  }
  values.push(row4);
  values.push(["", "", "", "", ""]);

  for (let i = 0; i < groups[0].campers.length; i++) {
    let curRow = [""];
    for (let j = 0; j < 4; j++) {
      curRow.push(groups[j].campers[i].name);
    }
    values.push(curRow);
  }

  curSheet.getActiveSheet().getRange(1,1,values.length,5).setValues(values);
  
}

// pulls coach names and rank for the week from master spreadsheet
function getCoaches() {
  // get week num to obtain coach data
  //let ui = SpreadsheetApp.getUi();
  //let result = ui.prompt("Week # for this roster?");

  //let offset = parseInt(result.getResponseText());

  let offset = 5;

  // attempt to open coach schedule
  let coachSheet = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1uGMcd_IhZGV0mfh0av7OjOJW9fxh2qm-k1nlTFyQ6-8/edit?usp=sharing");
  let coachData = coachSheet.getDataRange().getValues();

  // parse coaches for the week from spreadsheet
  let mentors = [];
  let assistants = [];
  let heads = [];

  for (let i = 3; i < 15; i++) {
    if (coachData[i][offset] === "x") {
      mentors.push(coachData[i][0]);
    }
  }

  for (let i = 19; i < 32; i++) {
    if (coachData[i][offset] === "x") {
      assistants.push(coachData[i][0]);
    }
  }

  for (let i = 36; i < 45; i++) {
    if (coachData[i][offset] === "x") {
      heads.push(coachData[i][0]);
    }
  }

  return {
            mentors:mentors, 
            assistants:assistants, 
            heads:heads
         };
}

// uses data from roster to rank a camper
// returns -1 for camper rank when survey 
// is not fully filled out, indicating on-site
// evaluation of skills
// returns an object with camper name and rank
function rankCamper(camperData) {
  let camperRank = 0;
  let surveyValid = 0;

  // adjustable weights for fine tuning
  let ageWeight = 1;
  let prevCampWeight = 1;
  let introClassWeight = 1;
  let rideFrequencyWeight = 1;
  let dropWeight = 1;

  // add age to rank
  camperRank += ageWeight * camperData[2];

  // add previous camps to rank
  switch (camperData[10]) {
    case "None":
      break;
    case "4+":
      camperRank += prevCampWeight * 4;
    case "":
      surveyValid++;
      break;
    default:
      camperRank += prevCampWeight * camperData[10];
  }

  // add intro class to rank
  if (camperData[11] === "Yes") {
    camperRank += introClassWeight;
  }

  // add ride frequency to rank
  switch(camperData[12]) {
    case "Rarely - 1x/month or less":
      camperRank+=1 * rideFrequencyWeight;
      break;

    case "Occasionally - 2x/month":
      camperRank+=2 * rideFrequencyWeight;
      break;

    case "Frequently - 1x/week or more":
      camperRank+=3 * rideFrequencyWeight;
      break;

    case "":
      surveyValid++;
  }

  // add drop size to rank
  switch(camperData[13]) {
    case "None":
      break;

    case "Rolling off a curb height (drop 1 in the Duthie clearing)":
      camperRank += 1 * dropWeight;
      break;
    
    case "Up to 1 foot (drop 2 in the Duthie clearing)":
      camperRank += 2 * dropWeight;
      break;

    case "Up to 2 feet (drop 3 in Duthie clearing)":
      camperRank += 3 * dropWeight;
      break;

    case "Over 2 feet (drop 4 in the Duthie Clearing)":
      camperRank += 4 * dropWeight;
      break;

    case "":
      surveyValid++;
  }

  // check if camper survey is valid
  if (surveyValid > 2) {
    camperRank = -1;
  }

  return {name:camperData[0], rank:camperRank};
}
