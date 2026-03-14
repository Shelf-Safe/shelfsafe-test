import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
    {
        orgId: {
            type: String,
            default: '',
            index: true,
        },
        reportType: {
            type: String,
            required: true,
            index: true,
        },
        reportSubType: {
            type: String,
            default: '',
            index: true,
        },
        filters: {
            type: Object,
            default: {},
        },
        generatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        format: {
            type: String,
            enum: ['PDF', 'CSV'],
            required: true,
        },
        fileUrl: {
            type: String,
            required: true,
        },
        fileName: {
            type: String,
            required: true,
        },
        mimeType: {
            type: String,
            required: true,
        },
        recordCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    },
);

export default mongoose.model('Report', reportSchema);
