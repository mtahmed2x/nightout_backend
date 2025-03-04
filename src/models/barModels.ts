import { BarScheduleStatus, BarType, CrowdMeter, Day } from "@shared/enums";
import mongoose, { Schema } from "mongoose";

export type BarSchema = {
  name: string;
  placeId: string;
  barType: string;
  waitTime: number;
  crowdMeter: CrowdMeter;
  total_reviewer: number;
  average_rating: number;
  cover: string;
  gallery: string[];
  about: {
    address: {
      placeName: string;
      latitude: number;
      longitude: number;
    };
    schedule: {
      day: Day;
      time: string;
      status: BarScheduleStatus;
    }[];
    dressCode: string[];
    music: string[];
    snacks: {
      name: string;
      cost: number;
    }[];
    drinks: {
      name: string;
      cost: number;
    }[];
    website: string;
  }
}

const barSchema = new Schema<BarSchema>({
  name: { type: String, required: true },
  placeId: { type: String },
  barType: { type: String},
  waitTime: { type: Number },
  crowdMeter: { type: String, enum: Object.values(CrowdMeter)},
  total_reviewer: { type: Number },
  average_rating: { type: Number},
  cover: { type: String },
  gallery: { type: [String] },
  about: {
    address: {
      placeName: { type: String },
      latitude: { type: Number },
      longitude: { type: Number }
    },
    schedule: [{
      day: { type: String, enum: Object.values(Day) },
      time: { type: String, required: true },
      status: { type: String, enum: Object.values(BarScheduleStatus) }
    }],
    dressCode: { type: [String] },
    music: { type: [String]},
    snacks: [
      {
        name: { type: String },
        cost: { type: Number }
      }
    ],
    drinks: [
      {
        name: { type: String },
        cost: { type: Number }
      }
    ],
    website: { type: String }
  }
}, { timestamps: true });

const Bar = mongoose.model<BarSchema>("Bar", barSchema);
export default Bar;