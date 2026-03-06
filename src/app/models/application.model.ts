export interface Application {
    _id?: string;
    id?: string;
    opportunity_id: any;
    volunteer_id: any;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt?: Date;
    updatedAt?: Date;
}
