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
  if (title.value.length < 5) {
    setError("Title < 5 Characters!");
	return;
  }
  if (content.value.length < 5) {
    setError("Content < 5 Characters!");
	return;
  }
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.url.search("unrealengine.com/marketplace") < 0) {
    setError("Tab Not UE Marketplace!");
	return;
  }
  const bearer = await chrome.cookies.get({url:"https://www.unrealengine.com", name:"EPIC_BEARER_TOKEN"});
  if (!bearer) {
    setError("Not Logged In!");
	return;
  }
  const cookie = await chrome.cookies.get({url:"https://www.unrealengine.com/marketplace", name:"XSRF-TOKEN"});
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
      var addReview = function(product, owner, token, stars, subject, message) {
        fetch("https://www.unrealengine.com/marketplace/api/review/" + product + "/reviews/add", {
          method: "POST",
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "x-requested-with": "XMLHttpRequest",
            "x-xsrf-token": token
          },
          body: JSON.stringify({ "rating": stars, "title": subject, "content": message, "targetOwner": owner })
        });
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
      const html = document.documentElement.outerHTML;
      const parts = html.split("\"productID\":\"");
      const product = parts.pop().split("\"").shift();
      var request = new XMLHttpRequest();
      request.open("GET", "https://www.unrealengine.com/marketplace/api/assets/asset/" + product, true);
      request.send(null);
      request.onreadystatechange = function() {
        if (request.readyState == 4)
          addReview(product, (request.responseText.split("\"owner\":\"")[1]).split("\"").shift(), arg1, arg2, arg3, arg4);
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