import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import * as turf from "@turf/turf";
import { l, mock, rand, randBetween } from "../helpers/common";

let apiHost = "",
  call;

const getRandomRadii = () => {
    const radius = randBetween(10, 15);

    return {
      radius,
      influence_radius: radius + 5
    };
  },
  getTagInfluence = () => {
    const center = [-73.96625, 40.78343],
      radius = 0.2,
      points = 25,
      randomPoints = turf.randomPoint(points, {
        bbox: turf.bbox(turf.circle(center, radius))
      }),
      response = {
        id: rand(4),
        areas: randomPoints.features.map((feature, idx) => {
          const { coordinates } = feature.geometry,
            { radius, influence_radius } = getRandomRadii();

          return {
            id: idx,
            geometry: {
              coordinates
            },
            properties: {
              type: "circle",
              radius
            },
            influence_polygon: {
              properties: {
                influence_radius
              },
              geometry: {
                coordinates
              }
            }
          };
        })
      };

    // l(response);
    return [response];
    // Example response
    // return [
    //   {
    //     id: 1,
    //     areas: [
    //       {
    //         id: 1,
    //         geometry: {
    //           coordinates: [-73.96625, 40.78343]
    //         },
    //         properties: {
    //           type: "circle",
    //           radius: 10
    //         },
    //         influence_polygon: {
    //           properties: {
    //             influence_radius: 15
    //           },
    //           geometry: {
    //             coordinates: [-73.96625, 40.78343]
    //           }
    //         }
    //       },
    //       {
    //         id: 2,
    //         geometry: {
    //           coordinates: [-73.96625, 40.784877315831444]
    //         },
    //         properties: {
    //           type: "circle",
    //           radius: 20
    //         },
    //         influence_polygon: {
    //           properties: {
    //             influence_radius: 25
    //           },
    //           geometry: {
    //             coordinates: [-73.96625, 40.784877315831444]
    //           }
    //         }
    //       }
    //     ]
    //   }
    // ];
  };

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
      .reply(() => {
        return [
          200,
          {
            tags: getTagInfluence()
          }
        ];
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
