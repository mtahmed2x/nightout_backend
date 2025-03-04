import { Schema, Document, model } from "mongoose";

type PrivacySchema = Document & {
  text: string;
};

const privacySchema = new Schema<PrivacySchema>({
  text: {
    type: String,
  },
});

const Privacy = model<PrivacySchema>("Privacy", privacySchema);
export default Privacy;