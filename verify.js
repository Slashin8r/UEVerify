const form = document.getElementById("control-row");
const rating = document.getElementById("rating");
const title = document.getElementById("title");
const content = document.getElementById("content");
const error = document.getElementById("error");

(async function initPopupWindow() {
  title.focus();
})();

form.addEventListener("submit", handleFormSubmit);

async function handleFormSubmit(event) {
  event.preventDefault();
  clearError();
  //Check Title to make sure it has 5 or more characters.
  if (title.value.length < 5) {
    setError("Title < 5 Characters!");
	return;
  }
  //Check Content message to make sure it has 5 or more characters.
  if (content.value.length < 5) {
    setError("Content < 5 Characters!");
	return;
  }
  //Get the current active tab.
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  //Check active tab URL to make sure it is an Unreal Engine Marketplace page.
  if (tab.url.search("unrealengine.com/marketplace") < 0) {
    setError("Tab Not UE Marketplace!");
	return;
  }
  //Get the bearer token of the logged in user.
  const bearer = await chrome.cookies.get({url:"https://www.unrealengine.com", name:"EPIC_BEARER_TOKEN"});
  //Check if user is currently logged in.
  if (!bearer) {
    setError("Not Logged In!");
	return;
  }
  //Get the api authentication token.
  const cookie = await chrome.cookies.get({url:"https://www.unrealengine.com/marketplace", name:"XSRF-TOKEN"});
  //Check if user has a valid token.
  if (!cookie) {
    setError("Not Authorized!");
	return;
  }
  await chrome.scripting.executeScript({
    args: [cookie.value, rating.value, title.value, content.value],
    target: {
      tabId: tab.id,
    },
    func: (arg1, arg2, arg3, arg4) => {
      //Function used to add a review.
      var addReview = function(product, owner, token, stars, subject, message) {
        //Add the review exactly as it was filled out in the extension's form.
        fetch("https://www.unrealengine.com/marketplace/api/review/" + product + "/reviews/add", {
          method: "POST",
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "x-requested-with": "XMLHttpRequest",
            "x-xsrf-token": token
          },
          body: JSON.stringify({ "rating": stars, "title": subject, "content": message, "targetOwner": owner })
        });
        //Overwrite the review to make it look as though it was submitted from the Unreal Engine Marketplace.
		fetch("https://www.unrealengine.com/marketplace/api/review/" + product + "/reviews/add", {
          method: "POST",
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "x-requested-with": "XMLHttpRequest",
            "x-xsrf-token": token
          },
          body: JSON.stringify({ "rating": stars, "title": "-----", "content": "-----", "targetOwner": owner })
        });
        //Attempt to add a question, which failed since Epic Games completely removed the logic for adding questions.
        /*fetch("https://www.unrealengine.com/marketplace/api/review/" + product + "/questions/add", {
          method: "POST",
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "x-requested-with": "XMLHttpRequest",
            "x-xsrf-token": token
          },
          body: JSON.stringify({ "title": subject, "content": message, "targetOwner": owner })
        });*/
      }
      //Get the source HTML of the current active tab.
      const html = document.documentElement.outerHTML;
      //Find the productID of the product page.
      const parts = html.split("\"productID\":\"");
      const product = parts.pop().split("\"").shift();
      //Get the product information.
      var request = new XMLHttpRequest();
      request.open("GET", "https://www.unrealengine.com/marketplace/api/assets/asset/" + product, true);
      request.send(null);
      request.onreadystatechange = function() {
        if (request.readyState == 4) {
          //Get the owner ID of the product and then add the review.
          addReview(product, (request.responseText.split("\"owner\":\"")[1]).split("\"").shift(), arg1, arg2, arg3, arg4);
        }
      };
    }
  });
  setError("Verified!");
}

function setError(str) {
  error.textContent = str;
  error.hidden = false;
}

function clearError() {
  error.textContent = "";
  error.hidden = true;
}