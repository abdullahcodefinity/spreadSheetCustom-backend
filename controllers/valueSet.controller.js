
import { prismaClient } from '../lib/prisma.js';
import { defineAbilityFor, hasPermission } from '../lib/ability.js';


export const createValueSet = async (req, res) => {
    try {
        const { name, values } = req.body;
        const { permissions } = req.user;

        const ability = defineAbilityFor({ permissions });

        if (!ability.can('create', 'ValueSet')) {
            return res.status(403).json({
                error: true,
                message: 'You do not have permission to create value sets'
            });
        }

        const valueSet = await prismaClient.valueSet.create({
            data: {
                name,
                values
            }
        });

        res.json(valueSet);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating value set' });
    }
};

export const getValueSets = async (req, res) => {
    try {
        const valueSets = await prismaClient.valueSet.findMany();
        res.json(valueSets);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching value sets' });
    }
};

export const getValueSet = async (req, res) => {
    try {
        const { id } = req.params;

        const valueSet = await prismaClient.valueSet.findUnique({
            where: { id: Number(id) }
        });

        if (!valueSet) {
            return res.status(404).json({ error: 'Value set not found' });
        }

        res.json(valueSet);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching value set' });
    }
};

export const updateValueSet = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, values } = req.body;
        const { permissions } = req.user;

        const ability = defineAbilityFor({ permissions });

        if (!ability.can('update', 'ValueSet')) {
            return res.status(403).json({
                error: true,
                message: 'You do not have permission to update value sets'
            });
        }

        const valueSet = await prismaClient.valueSet.update({
            where: { id: Number(id) },
            data: {
                name,
                values
            }
        });

        res.json({ data: valueSet, message: "Value set updated" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating value set' });
    }
};

export const deleteValueSet = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.user;

        const ability = defineAbilityFor({ permissions });

        if (!ability.can('delete', 'ValueSet')) {
            return res.status(403).json({
                error: true,
                message: 'You do not have permission to delete value sets'
            });
        }

        // Check if value set exists before deleting
        const existingValueSet = await prismaClient.valueSet.findUnique({
            where: { id: Number(id) },
            include: {
                columnDropdowns: true
            }
        });

        if (!existingValueSet) {
            return res.status(404).json({
                error: true,
                message: 'Value set not found'
            });
        }

        // First delete all related column dropdowns
        await prismaClient.columnDropdown.deleteMany({
            where: { valueSetId: Number(id) }
        });

        // Then delete the value set
        await prismaClient.valueSet.delete({
            where: { id: Number(id) }
        });

        res.json({
            error: false,
            message: 'Value set deleted successfully'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting value set' });
    }
};
