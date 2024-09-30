import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { l, mock } from "../helpers/common";

let apiHost = "",
  call;

export default class HttpService {
  constructor() {
    if (mock) {
      this.initMock();
    } else {
      // apiHost = 'https://api-admin.oyster.ai'
      apiHost = "https://api-admin-staging.oyster.ai";
    }
  }
  initMock() {
    l("Mock");
    new MockAdapter(axios, { delayResponse: 1000 })
      .onPost("/api/v1/login")
      .reply(200)
      .onGet("/api/v1/tags")
      .reply(200, {
        results: [
          { id: 1, full_name: "Hamburgers" },
          { id: 2, full_name: "Fish & Steak" },
          { id: 3, full_name: "Classic Kitchen" },
          { id: 4, full_name: "BBQ" },
          { id: 5, full_name: "Coffee" },
          { id: 6, full_name: "Pizza" }
        ]
      })
      .onGet("/api/v1/tags-influence")
      .reply(200, {
        tags: [
          {
            id: 1,
            areas: [
              {
                id: 1,
                geometry: {
                  coordinates: [-73.96625, 40.78343]
                },
                properties: {
                  type: "circle",
                  radius: 10
                },
                influence_polygon: {
                  properties: {
                    influence_radius: 15
                  },
                  geometry: {
                    coordinates: [-73.96625, 40.78343]
                  }
                }
              }
            ]
          }
        ]
      });
  }

  get(url, params, auth) {
    let config = {
      method: "get",
      url: apiHost + url,
      params,
      auth
    };

    return this.doRequest(config);
  }

  delete(url, params, auth) {
    let config = {
      method: "delete",
      url: apiHost + url,
      params,
      auth
    };

    return this.doRequest(config);
  }

  post(url, data, auth, onUploadProgress) {
    let config = {
      method: "post",
      url: apiHost + url,
      data,
      auth,
      onUploadProgress
    };

    return this.doRequest(config);
  }

  put(url, data, auth, onUploadProgress) {
    let config = {
      method: "put",
      url: apiHost + url,
      data,
      auth,
      onUploadProgress
    };
    return this.doRequest(config);
  }

  doRequest = config => {
    // l(config)
    if (config.params && config.params.series) {
      delete config.params.series;
      if (call) {
        call.cancel("One request at a time, fellas!");
      }
      call = axios.CancelToken.source();
      config.cancelToken = call.token;
    }
    return axios(config);
  };
}
