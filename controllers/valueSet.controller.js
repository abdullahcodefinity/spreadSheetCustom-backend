import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create a new value set
export const createValueSet = async (req, res) => {
    try {
        const { name, values } = req.body;
        const userRole = req.user.role;

        // Only SuperAdmin can create value sets
        if (userRole !== 'SuperAdmin') {
            return res.status(403).json({
                error: true,
                message: 'You do not have permission to create value sets'
            });
        }

        if (!name || !Array.isArray(values)) {
            return res.status(400).json({
                error: true,
                message: 'Name and values array are required'
            });
        }

        // Check if value set with same name already exists
        const existingValueSet = await prisma.valueSet.findFirst({
            where: { name }
        });

        if (existingValueSet) {
            return res.status(400).json({
                error: true,
                message: 'A value set with this name already exists'
            });
        }

        const valueSet = await prisma.valueSet.create({
            data: {
                name,
                values
            }
        });

        res.status(201).json({
            error: false,
            data: valueSet,
            message: 'Value set created successfully'
        });
    } catch (error) {
        console.error('Error creating value set:', error);
        res.status(500).json({
            error: true,
            message: 'Error creating value set'
        });
    }
};

// Get all value sets
export const getValueSets = async (req, res) => {
    try {
        const valueSets = await prisma.valueSet.findMany({
            include: {
                columnDropdowns: {
                    include: {
                        sheet: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });

        res.json({
            error: false,
            data: valueSets
        });
    } catch (error) {
        console.error('Error fetching value sets:', error);
        res.status(500).json({
            error: true,
            message: 'Error fetching value sets'
        });
    }
};

// Get a single value set by ID
export const getValueSet = async (req, res) => {
    try {
        const { id } = req.params;

        const valueSet = await prisma.valueSet.findUnique({
            where: { id: parseInt(id) },
            include: {
                columnDropdowns: {
                    include: {
                        sheet: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });

        if (!valueSet) {
            return res.status(404).json({
                error: true,
                message: 'Value set not found'
            });
        }

        res.json({
            error: false,
            data: valueSet
        });
    } catch (error) {
        console.error('Error fetching value set:', error);
        res.status(500).json({
            error: true,
            message: 'Error fetching value set'
        });
    }
};

// Update a value set
export const updateValueSet = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, values } = req.body;
        const userRole = req.user.role;

        // Only SuperAdmin can update value sets
        if (userRole !== 'SuperAdmin') {
            return res.status(403).json({
                error: true,
                message: 'You do not have permission to update value sets'
            });
        }

        if (!name && !Array.isArray(values)) {
            return res.status(400).json({
                error: true,
                message: 'At least name or values array is required'
            });
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (Array.isArray(values)) updateData.values = values;

        const valueSet = await prisma.valueSet.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        res.json({
            error: false,
            data: valueSet,
            message: 'Value set updated successfully'
        });
    } catch (error) {
        console.error('Error updating value set:', error);
        res.status(500).json({
            error: true,
            message: 'Error updating value set'
        });
    }
};

// Delete a value set
export const deleteValueSet = async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.user.role;

        // Only SuperAdmin can delete value sets
        if (userRole !== 'SuperAdmin') {
            return res.status(403).json({
                error: true,
                message: 'You do not have permission to delete value sets'
            });
        }

        // Check if value set is being used in any column dropdowns
        const columnDropdowns = await prisma.columnDropdown.findMany({
            where: { valueSetId: parseInt(id) }
        });

        if (columnDropdowns.length > 0) {
            return res.status(400).json({
                error: true,
                message: 'Cannot delete value set as it is being used in column dropdowns'
            });
        }

        await prisma.valueSet.delete({
            where: { id: parseInt(id) }
        });

        res.json({
            error: false,
            message: 'Value set deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting value set:', error);
        res.status(500).json({
            error: true,
            message: 'Error deleting value set'
        });
    }
};
